# Claude Code CLI Slash-Command & @ Mention 对齐集成

**Date:** 2026-02-09

## Context

open-app 是一个基于 Electron 的桌面应用，已经通过 `execa` 调用本地 `claude` CLI 来执行 AI 交互。当前项目具备基础的 slash-command 系统（9 个命令：`/help`, `/clear`, `/model`, `/compact`, `/review`, `/plan`, `/status`, `/diff`, `/test`）和 `@` 文件引用功能（前缀+子串匹配）。

目标是将 slash-command 和 `@` 引用功能**完全对齐真正的 Claude Code CLI**，包括补齐所有缺失命令、增强 `@` 引用类型、支持 Skills 自定义命令系统，并引入流式输出。

## Discussion

### 架构方案选择

探讨了三种整体架构方案：

1. **渐进扩展** — 在现有 registry/parser/mentions 架构上逐步扩展，改动最小但可能遇到可扩展性瓶颈。
2. **插件化重构** — 将命令和 `@` 引用重构为插件化架构，每个类型是独立插件，更强可扩展性但需较大重构。
3. **CLI 代理模式（最终选择）** — 命令注册和补全在 UI 层维护，实际执行大部分代理给本地安装的 `claude` CLI。最少的内部逻辑重复实现，行为与 CLI 天然一致。

**最终决策：** 采用 CLI 代理模式。理由是项目已有 `execa` 调用 `claude` CLI 的基础设施，代理到 CLI 可以最大限度地保持行为一致性，避免重复实现每个命令的内部逻辑。

### 命令差距分析

Claude Code CLI 拥有约 25+ 个内置命令，当前项目仅覆盖 9 个。差距集中在：

- **会话管理：** 缺少 `/compact`, `/resume`, `/rewind`, `/rename`, `/export`, `/copy`, `/exit`
- **上下文与记忆：** 缺少 `/context`, `/memory`, `/init`, `/add-dir`
- **开发工作流：** 缺少 `/todos`, `/tasks`, `/debug`
- **配置与设置：** 缺少 `/config`, `/permissions`, `/cost`, `/theme`, `/vim`, `/usage`, `/stats`
- **诊断与系统：** 缺少 `/doctor`, `/bug`
- **集成：** 缺少 `/mcp`
- **自定义：** 缺少 Skills 系统

### @ 引用差距分析

| 类型 | 当前状态 | CLI 支持 |
|------|---------|---------|
| 文件引用 `@file` | 有（前缀+子串匹配） | 模糊匹配、respects .gitignore |
| 目录引用 `@dir/` | 无 | 返回目录列表 |
| 图片引用 `@image.png` | 无 | 多模态附件 |
| MCP 资源 `@server:res` | 无 | 需 MCP 基础设施 |
| 拖放/粘贴 | 无 | Electron 原生支持 |

## Approach

### 命令系统：三层处理模型

将所有命令分为三层，按处理方式路由：

| 层级 | 处理方式 | 命令 |
|------|---------|------|
| **Local** | Renderer 或 Main 内部直接处理 | `/help`, `/clear`, `/exit`, `/theme`, `/vim`, `/copy` |
| **CLI Proxy** | 构建参数后代理给 `claude` CLI | `/compact`, `/review`, `/plan`, `/model`, `/cost`, `/doctor`, `/status`, `/config`, `/permissions`, `/memory`, `/init`, `/mcp`, `/context`, `/export`, `/bug` |
| **Session** | 需要会话状态管理 | `/resume`, `/rewind`, `/rename`, `/todos`, `/tasks` |

### @ 引用系统：Provider 架构

将当前 `mentions.ts` 的单一文件索引重构为 **MentionProvider 接口**，每种引用类型实现一个 provider：

- **FileMentionProvider** — 增强模糊匹配，respects .gitignore
- **DirMentionProvider** — 目录引用，返回目录结构
- **ImageMentionProvider** — 图片附件，支持拖放和粘贴
- **McpMentionProvider** — MCP 资源引用（依赖 MCP 基础设施）

### Skills 自定义命令系统

对齐 Claude Code 的 Skills/Custom Commands，扫描以下路径动态加载：

1. `~/.claude/skills/<name>/SKILL.md` — 全局用户自定义
2. `.claude/skills/<name>/SKILL.md` — 项目级自定义
3. `.claude/commands/<name>.md` — 兼容旧格式

### 流式输出

对 AI 交互类命令（`/compact`, `/review` 等）引入 streaming 支持，通过 IPC 事件逐块推送到 Renderer 实时渲染。

## Architecture

### Registry 扩展

在现有 `registry.ts` 的命令定义结构上新增字段：

```ts
interface CommandDefinition {
  name: string;
  syntax: string;
  description: string;
  category: 'session' | 'context' | 'workflow' | 'config' | 'diagnostics' | 'integration' | 'custom';
  handler: 'local' | 'cli-proxy' | 'session';
  minArgs: number;
  maxArgs: number;
  allowFlags?: boolean;
}
```

新增约 20 个命令注册：

- **会话管理：** `/compact`, `/resume`, `/rewind`, `/rename`, `/export`, `/copy`, `/exit`
- **上下文与记忆：** `/context`, `/memory`, `/init`, `/add-dir`
- **开发工作流：** `/todos`, `/tasks`, `/debug`
- **配置与设置：** `/config`, `/permissions`, `/cost`, `/theme`, `/vim`, `/usage`, `/stats`
- **诊断与系统：** `/doctor`, `/bug`
- **集成：** `/mcp`

### 下拉列表 UI

- 输入 `/` 时展示所有命令，按 `category` 分组显示（带分组标题）
- 继续输入则过滤匹配
- 每个命令项显示：名称 + 简短描述
- 需要参数的命令，选中后自动补全到 `/command ` 留光标等待输入
- Skills 自定义命令标记为 "Custom" 类别

### @ 引用 Provider 架构

```
用户输入 @xxx
    ↓
detectSuggestionContext() 判断类型
    ↓
┌───────────────────┬────────────────────┬─────────────────────┬────────────────────┐
│ FileMentionProvider│ DirMentionProvider │ ImageMentionProvider │ McpMentionProvider │
│ (增强模糊匹配)     │ (目录列表)         │ (图片附件)           │ (MCP 资源)         │
└───────────────────┴────────────────────┴─────────────────────┴────────────────────┘
    ↓
合并结果，按相关性排序，返回补全列表
```

**文件引用增强：**
- 路径片段模糊匹配（输入 `@Button` 匹配 `src/components/Button.tsx`）
- 索引时自动排除 `.gitignore` 中的路径（替代当前硬编码排除列表）

**目录引用：**
- 以 `/` 结尾识别为目录
- 补全列表中目录带文件夹图标
- 解析时返回目录树结构（限制 2 层深度）

**图片引用：**
- 自动识别图片扩展名（`.png`, `.jpg`, `.gif`, `.svg`, `.webp`）
- 传给 Claude API 时作为 `image` content block
- 支持 Electron 原生拖放和剪贴板粘贴

**MCP 资源引用：**
- 语法 `@server-name:resource-uri`
- 依赖 `/mcp` 命令建立连接后可用

### CLI 代理执行层

```
用户输入 /compact focus on auth
    ↓
registry 查到 handler: 'cli-proxy'
    ↓
构建 CLI 调用参数
    ↓
execa('claude', ['-p', '/compact focus on auth'])
    ↓
streaming: stdout 逐块推送 → IPC send → Renderer 实时渲染
    ↓
完成: 解析输出 → ComposerExecutionResult
```

不同命令类型的 CLI 调用方式：

| 命令类型 | CLI 调用方式 |
|---------|-------------|
| AI 交互类（`/compact`, `/review`, `/plan`） | `claude -p "/compact ..."` + streaming |
| 查询类（`/cost`, `/status`, `/doctor`） | `claude -p "/cost"` 解析 JSON 输出 |
| 设置类（`/config`, `/permissions`） | Electron 内构建 UI + `claude config` 子命令 |
| 文件操作类（`/memory`, `/init`） | 调用 CLI 或直接操作 CLAUDE.md 文件 |

### Streaming IPC 协议

新增 IPC 事件频道：

- `composer:stream-chunk` — 逐块推送 AI 输出
- `composer:stream-end` — 流式输出结束

Renderer 端使用 `events.on('composer:stream-chunk', handler)` 订阅，实时追加渲染 markdown。

### Skills 系统

```
启动时 / workspace 切换时
    ↓
扫描 Skills 路径
    ↓
解析 YAML frontmatter（获取元数据）
    ↓
动态注册到 registry（category: 'custom'）
    ↓
用户选择执行时：
    SKILL.md 内容 + $ARGUMENTS 替换 → 发送给 claude CLI
```

支持的 SKILL.md 特性：
- `$ARGUMENTS` — 替换为用户传入的参数
- `$ARGUMENTS[N]` / `$N` — 位置参数
- `` !`command` `` — Shell 命令预处理
- `context: fork` — 隔离子 agent 上下文
- `allowed-tools` — 限制可用工具

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/main/composer/registry.ts` | 修改 | 扩展命令定义，新增 ~20 个命令，增加 category/handler 字段 |
| `src/main/composer/parser.ts` | 修改 | 增强 @ 引用解析（目录、图片、MCP） |
| `src/main/composer/mentions.ts` | 重构 | 拆分为 MentionProvider 接口 |
| `src/main/composer/index.ts` | 修改 | 适配新的 mention providers |
| `src/main/providers/claude.ts` | 修改 | 新增 streaming 模式、CLI proxy 路由 |
| `src/main/providers/index.ts` | 修改 | 新增命令路由逻辑 |
| `src/shared/composer.ts` | 修改 | 新增类型定义（category, handler, mention types） |
| `src/preload/index.ts` | 修改 | 暴露新的 IPC 频道（stream, skills） |
| `src/renderer/App.tsx` | 修改 | 下拉列表分组 UI、流式渲染、拖放/粘贴 |
| `src/main/skills/` | **新增** | Skills 发现、解析、注册模块 |
| `src/main/ipc/index.ts` | 修改 | 新增 stream 和 skills 相关 handlers |
