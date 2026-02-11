# Claude Code CLI Slash-Command and @ Mention Alignment Integration

**Date:** 2026-02-09

## Context

open-app is an Electron-based desktop application that already invokes the local `claude` CLI via `execa` for AI interactions. The current project includes a basic slash-command system (9 commands: `/help`, `/clear`, `/model`, `/compact`, `/review`, `/plan`, `/status`, `/diff`, `/test`) and `@` file references (prefix + substring matching).

The goal is to fully align slash-command and `@` reference capabilities with the real Claude Code CLI, including all missing built-in commands, richer `@` reference types, support for Skills/custom commands, and streaming output.

## Discussion

### Architecture Options

We evaluated three end-to-end architecture approaches:

1. **Incremental extension**: Gradually extend the existing registry/parser/mentions architecture. This minimizes changes but may hit scalability limits.
2. **Plugin-based refactor**: Refactor commands and `@` references into a plugin architecture, where each type is an independent plugin. This improves extensibility but requires larger refactoring.
3. **CLI proxy model (selected)**: Keep command registration and completion in the UI layer, while proxying most execution to the locally installed `claude` CLI. This minimizes duplicated internal logic and keeps behavior naturally consistent with the CLI.

**Final decision:** adopt the CLI proxy model. Since the project already has `execa`-based integration with the `claude` CLI, proxying execution maximizes behavioral consistency and avoids reimplementing command internals.

### Command Gap Analysis

Claude Code CLI provides roughly 25+ built-in commands, while the current project only covers 9. The gaps are concentrated in:

- **Session management:** missing `/compact`, `/resume`, `/rewind`, `/rename`, `/export`, `/copy`, `/exit`
- **Context and memory:** missing `/context`, `/memory`, `/init`, `/add-dir`
- **Development workflow:** missing `/todos`, `/tasks`, `/debug`
- **Configuration and settings:** missing `/config`, `/permissions`, `/cost`, `/theme`, `/vim`, `/usage`, `/stats`
- **Diagnostics and system:** missing `/doctor`, `/bug`
- **Integrations:** missing `/mcp`
- **Customization:** missing the Skills system

### @ Reference Gap Analysis

| Type | Current Status | CLI Support |
|------|----------------|-------------|
| File reference `@file` | Available (prefix + substring matching) | Fuzzy matching, respects `.gitignore` |
| Directory reference `@dir/` | Not available | Returns directory list |
| Image reference `@image.png` | Not available | Multimodal attachments |
| MCP resource `@server:res` | Not available | Requires MCP infrastructure |
| Drag-and-drop / paste | Not available | Native Electron support |

## Approach

### Command System: Three-Tier Processing Model

All commands are grouped into three tiers and routed by handling strategy:

| Tier | Handling Strategy | Commands |
|------|-------------------|----------|
| **Local** | Handled directly in Renderer or Main | `/help`, `/clear`, `/exit`, `/theme`, `/vim`, `/copy` |
| **CLI Proxy** | Build arguments and proxy to `claude` CLI | `/compact`, `/review`, `/plan`, `/model`, `/cost`, `/doctor`, `/status`, `/config`, `/permissions`, `/memory`, `/init`, `/mcp`, `/context`, `/export`, `/bug` |
| **Session** | Requires session state management | `/resume`, `/rewind`, `/rename`, `/todos`, `/tasks` |

### @ Reference System: Provider Architecture

Refactor the current single-file index in `mentions.ts` into a **MentionProvider interface**, where each reference type is implemented as a dedicated provider:

- **FileMentionProvider**: enhanced fuzzy matching, respects `.gitignore`
- **DirMentionProvider**: directory references, returns directory structure
- **ImageMentionProvider**: image attachments, supports drag-and-drop and paste
- **McpMentionProvider**: MCP resource references (depends on MCP infrastructure)

### Skills Custom Command System

Align with Claude Code Skills/custom commands by scanning and dynamically loading from:

1. `~/.claude/skills/<name>/SKILL.md` for global user-defined skills
2. `.claude/skills/<name>/SKILL.md` for project-level skills
3. `.claude/commands/<name>.md` for legacy compatibility

### Streaming Output

Introduce streaming support for AI interaction commands (for example `/compact`, `/review`) and push chunked output to Renderer in real time through IPC events.

## Architecture

### Registry Extensions

Add fields to the existing command definition in `registry.ts`:

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

Register approximately 20 additional commands:

- **Session management:** `/compact`, `/resume`, `/rewind`, `/rename`, `/export`, `/copy`, `/exit`
- **Context and memory:** `/context`, `/memory`, `/init`, `/add-dir`
- **Development workflow:** `/todos`, `/tasks`, `/debug`
- **Configuration and settings:** `/config`, `/permissions`, `/cost`, `/theme`, `/vim`, `/usage`, `/stats`
- **Diagnostics and system:** `/doctor`, `/bug`
- **Integrations:** `/mcp`

### Dropdown UI

- Show all commands when the user types `/`, grouped by `category` with group headers.
- Continue filtering as the user types.
- Show each command item as: command name + short description.
- For commands that require arguments, auto-complete to `/command ` and leave the cursor ready for input.
- Tag Skills-based custom commands under the "Custom" category.

### @ Reference Provider Architecture

```
User input: @xxx
    ↓
detectSuggestionContext() identifies the type
    ↓
┌────────────────────┬────────────────────┬──────────────────────┬────────────────────┐
│ FileMentionProvider│ DirMentionProvider │ ImageMentionProvider │ McpMentionProvider │
│ (enhanced fuzzy)   │ (directory list)   │ (image attachment)   │ (MCP resource)     │
└────────────────────┴────────────────────┴──────────────────────┴────────────────────┘
    ↓
Merge results, rank by relevance, return completion list
```

**File reference enhancements:**
- Fuzzy matching on path fragments (for example, `@Button` matches `src/components/Button.tsx`)
- Automatically exclude paths in `.gitignore` during indexing (replaces the current hardcoded exclusion list)

**Directory references:**
- Detect directory references by trailing `/`
- Display folder icon for directories in completion list
- Return directory tree structure during resolution (depth limited to 2 levels)

**Image references:**
- Auto-detect image extensions (`.png`, `.jpg`, `.gif`, `.svg`, `.webp`)
- Send as `image` content blocks to the Claude API
- Support native Electron drag-and-drop and clipboard paste

**MCP resource references:**
- Syntax: `@server-name:resource-uri`
- Available only after connection is established via `/mcp`

### CLI Proxy Execution Layer

```
User input: /compact focus on auth
    ↓
Registry resolves handler: 'cli-proxy'
    ↓
Build CLI invocation arguments
    ↓
execa('claude', ['-p', '/compact focus on auth'])
    ↓
Streaming: stdout chunks -> IPC send -> real-time Renderer rendering
    ↓
Completion: parse output -> ComposerExecutionResult
```

CLI invocation strategy by command type:

| Command Type | CLI Invocation Strategy |
|--------------|-------------------------|
| AI interaction commands (`/compact`, `/review`, `/plan`) | `claude -p "/compact ..."` + streaming |
| Query commands (`/cost`, `/status`, `/doctor`) | `claude -p "/cost"` and parse JSON output |
| Settings commands (`/config`, `/permissions`) | Build UI in Electron + `claude config` subcommands |
| File operation commands (`/memory`, `/init`) | Use CLI or modify `CLAUDE.md` directly |

### Streaming IPC Protocol

Add IPC event channels:

- `composer:stream-chunk`: push AI output chunks incrementally
- `composer:stream-end`: indicate stream completion

On the Renderer side, subscribe with `events.on('composer:stream-chunk', handler)` and append markdown in real time.

### Skills System

```
At app startup or workspace switch
    ↓
Scan Skills paths
    ↓
Parse YAML frontmatter (metadata extraction)
    ↓
Dynamically register into registry (category: 'custom')
    ↓
When user executes:
    SKILL.md content + $ARGUMENTS substitution -> send to claude CLI
```

Supported `SKILL.md` capabilities:
- `$ARGUMENTS`: replaced with user-supplied arguments
- `$ARGUMENTS[N]` / `$N`: positional arguments
- `` !`command` ``: shell command preprocessing
- `context: fork`: isolated child-agent context
- `allowed-tools`: tool access restrictions

### File Change List

| File | Change Type | Description |
|------|-------------|-------------|
| `src/main/composer/registry.ts` | Modified | Extend command definitions, add ~20 commands, add `category`/`handler` fields |
| `src/main/composer/parser.ts` | Modified | Enhance `@` reference parsing (directory, image, MCP) |
| `src/main/composer/mentions.ts` | Refactored | Split into `MentionProvider` interface |
| `src/main/composer/index.ts` | Modified | Adapt to new mention providers |
| `src/main/providers/claude.ts` | Modified | Add streaming mode and CLI proxy routing |
| `src/main/providers/index.ts` | Modified | Add command routing logic |
| `src/shared/composer.ts` | Modified | Add type definitions (`category`, `handler`, mention types) |
| `src/preload/index.ts` | Modified | Expose new IPC channels (stream, skills) |
| `src/renderer/App.tsx` | Modified | Grouped dropdown UI, streaming render, drag-and-drop/paste |
| `src/main/skills/` | **Added** | Skills discovery, parsing, registration module |
| `src/main/ipc/index.ts` | Modified | Add stream- and skills-related handlers |
