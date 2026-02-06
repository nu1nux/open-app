import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs$1 from "node:fs";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EventEmitter } from "node:events";
import chokidar from "chokidar";
import { execa } from "execa";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const state = {
  currentId: null,
  entries: [],
  ignoredPaths: []
};
let ready = Promise.resolve();
function getStorePath$1() {
  return path.join(app.getPath("userData"), "workspaces.json");
}
async function loadState() {
  try {
    const data = await fs.readFile(getStorePath$1(), "utf-8");
    const parsed = JSON.parse(data);
    state.currentId = parsed.currentId ?? null;
    state.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    state.ignoredPaths = Array.isArray(parsed.ignoredPaths) ? parsed.ignoredPaths : [];
  } catch {
    state.currentId = null;
    state.entries = [];
    state.ignoredPaths = [];
  }
}
async function saveState() {
  const payload = {
    currentId: state.currentId,
    entries: state.entries,
    ignoredPaths: state.ignoredPaths
  };
  await fs.writeFile(getStorePath$1(), JSON.stringify(payload, null, 2), "utf-8");
}
function findEntryByPath(dirPath) {
  return state.entries.find((entry) => entry.path === dirPath) ?? null;
}
function getEntryById(id) {
  if (!id) return null;
  return state.entries.find((entry) => entry.id === id) ?? null;
}
async function ensureReady() {
  await ready;
}
function initWorkspace() {
  ready = loadState();
}
async function listWorkspaces() {
  await ensureReady();
  return [...state.entries].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}
async function listRecentWorkspaces(limit = 5) {
  const list = await listWorkspaces();
  return list.slice(0, limit);
}
async function getCurrentWorkspace() {
  await ensureReady();
  return getEntryById(state.currentId);
}
async function setCurrentWorkspace(id) {
  await ensureReady();
  const entry = getEntryById(id);
  if (!entry) return null;
  state.currentId = entry.id;
  entry.lastOpenedAt = (/* @__PURE__ */ new Date()).toISOString();
  await saveState();
  return entry;
}
async function addWorkspace(dirPath) {
  await ensureReady();
  if (state.ignoredPaths.includes(dirPath)) {
    state.ignoredPaths = state.ignoredPaths.filter((path2) => path2 !== dirPath);
  }
  const existing = findEntryByPath(dirPath);
  if (existing) {
    existing.lastOpenedAt = (/* @__PURE__ */ new Date()).toISOString();
    state.currentId = existing.id;
    await saveState();
    return existing;
  }
  const entry = {
    id: randomUUID(),
    name: path.basename(dirPath),
    path: dirPath,
    lastOpenedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  state.entries.push(entry);
  state.currentId = entry.id;
  await saveState();
  return entry;
}
async function renameWorkspace(id, name) {
  await ensureReady();
  const entry = getEntryById(id);
  if (!entry) return null;
  const nextName = name.trim();
  if (!nextName) return null;
  entry.name = nextName;
  await saveState();
  return entry;
}
async function removeWorkspace(id) {
  await ensureReady();
  const index = state.entries.findIndex((entry) => entry.id === id);
  if (index === -1) return { removed: false, current: getEntryById(state.currentId) };
  const [removed] = state.entries.splice(index, 1);
  if (state.currentId === removed.id) {
    state.currentId = state.entries[0]?.id ?? null;
  }
  await saveState();
  return { removed: true, current: getEntryById(state.currentId) };
}
async function listIgnoredWorkspaces() {
  await ensureReady();
  return [...state.ignoredPaths];
}
async function ignoreWorkspacePath(pathToIgnore) {
  await ensureReady();
  if (!state.ignoredPaths.includes(pathToIgnore)) {
    state.ignoredPaths.push(pathToIgnore);
    await saveState();
  }
  return [...state.ignoredPaths];
}
async function restoreIgnoredWorkspace(pathToRestore) {
  await ensureReady();
  state.ignoredPaths = state.ignoredPaths.filter((value) => value !== pathToRestore);
  await saveState();
  return [...state.ignoredPaths];
}
const DEFAULT_DISCOVERY_DIRS = ["Desktop", "Documents", "Projects", "Code", "workspace", "dev"];
const IGNORE_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", "build", ".next", "out", "coverage"]);
async function discoverGitWorkspaces(options) {
  const home = app.getPath("home");
  const roots = options?.roots ?? (await Promise.all(
    DEFAULT_DISCOVERY_DIRS.map(async (dir) => {
      const full = path.join(home, dir);
      try {
        const stat = await fs.stat(full);
        return stat.isDirectory() ? full : null;
      } catch {
        return null;
      }
    })
  )).filter((value) => Boolean(value));
  const maxDepth = options?.maxDepth ?? 4;
  const limit = options?.limit ?? 50;
  const discovered = [];
  const visited = /* @__PURE__ */ new Set();
  const isGitRepo = async (dirPath) => {
    try {
      const stat = await fs.stat(path.join(dirPath, ".git"));
      return stat.isDirectory();
    } catch {
      return false;
    }
  };
  const walk = async (dirPath, depth) => {
    if (depth < 0 || discovered.length >= limit) return;
    let realPath = dirPath;
    try {
      realPath = await fs.realpath(dirPath);
    } catch {
      return;
    }
    if (visited.has(realPath)) return;
    visited.add(realPath);
    if (await isGitRepo(dirPath)) {
      try {
        const stat = await fs.stat(dirPath);
        discovered.push({
          name: path.basename(dirPath),
          path: dirPath,
          lastModifiedAt: stat.mtime.toISOString()
        });
      } catch {
        discovered.push({
          name: path.basename(dirPath),
          path: dirPath,
          lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return;
    }
    let entries = [];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory() || entry.isSymbolicLink()) return;
        if (IGNORE_DIRS.has(entry.name)) return;
        if (entry.name.startsWith(".")) return;
        await walk(path.join(dirPath, entry.name), depth - 1);
      })
    );
  };
  await Promise.all(roots.map((root) => walk(root, maxDepth)));
  const filtered = options?.includeIgnored ? discovered : discovered.filter((entry) => !state.ignoredPaths.includes(entry.path));
  return filtered.sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt)).slice(0, limit);
}
async function pickWorkspace() {
  await ensureReady();
  const window = BrowserWindow.getFocusedWindow();
  const options = {
    properties: ["openDirectory"],
    title: "Select a workspace folder"
  };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return addWorkspace(result.filePaths[0]);
}
async function getCurrentWorkspacePath() {
  const entry = await getCurrentWorkspace();
  return entry?.path ?? null;
}
const execFileAsync$1 = promisify(execFile);
async function runGit(args, cwd) {
  try {
    const { stdout } = await execFileAsync$1("git", args, { cwd });
    return { ok: true, stdout: stdout.trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      error: error?.stderr?.toString?.() ?? error?.message ?? "git command failed"
    };
  }
}
async function getGitSummary() {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: "No workspace selected" };
  }
  const repoCheck = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
  if (!repoCheck.ok || repoCheck.stdout !== "true") {
    return { available: false, reason: "Not a git repository" };
  }
  const root = await runGit(["rev-parse", "--show-toplevel"], cwd);
  const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const status = await runGit(["status", "-sb"], cwd);
  const lastCommit = await runGit(
    ["log", "-1", "--pretty=format:%h %s (%an, %ad)", "--date=short"],
    cwd
  );
  return {
    available: true,
    root: root.ok ? root.stdout : void 0,
    branch: branch.ok ? branch.stdout : void 0,
    status: status.ok ? status.stdout : void 0,
    lastCommit: lastCommit.ok ? lastCommit.stdout : void 0
  };
}
async function getGitStatus() {
  const summary = await getGitSummary();
  if (!summary.available) {
    return summary;
  }
  return { ...summary, status: summary.status ?? "" };
}
async function getGitFileStatuses() {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: "No workspace selected", files: [] };
  }
  const repoCheck = await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
  if (!repoCheck.ok || repoCheck.stdout !== "true") {
    return { available: false, reason: "Not a git repository", files: [] };
  }
  const status = await runGit(["status", "--porcelain=v1"], cwd);
  if (!status.ok) {
    return { available: false, reason: status.error ?? "git status failed", files: [] };
  }
  const files = status.stdout.split("\n").map((line) => line.trimEnd()).filter(Boolean).map((line) => {
    const statusCode = line.slice(0, 2);
    const rawPath = line.slice(3).trim();
    const pathPart = rawPath.includes(" -> ") ? rawPath.split(" -> ").slice(-1)[0] : rawPath;
    return {
      path: pathPart,
      status: statusCode,
      staged: statusCode[0] !== " ",
      unstaged: statusCode[1] !== " "
    };
  });
  return { available: true, files };
}
const execFileAsync = promisify(execFile);
const MAX_CHARS = 2e4;
function truncate(text) {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}
...diff truncated (${text.length - MAX_CHARS} more chars)`;
}
async function runGitDiff(args, cwd) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    const content = stdout.trim();
    return content.length === 0 ? "(no changes)" : truncate(content);
  } catch (error) {
    return `git diff failed: ${error?.stderr?.toString?.() ?? error?.message ?? "unknown error"}`;
  }
}
async function ensureRepo(cwd) {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"], { cwd });
    return true;
  } catch {
    return false;
  }
}
async function getDiff() {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: "No workspace selected" };
  }
  const isRepo = await ensureRepo(cwd);
  if (!isRepo) {
    return { available: false, reason: "Not a git repository" };
  }
  const unstaged = await runGitDiff(["diff"], cwd);
  const staged = await runGitDiff(["diff", "--staged"], cwd);
  return {
    available: true,
    unstaged,
    staged
  };
}
async function getDiffForFile(filePath) {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: "No workspace selected" };
  }
  const isRepo = await ensureRepo(cwd);
  if (!isRepo) {
    return { available: false, reason: "Not a git repository" };
  }
  const unstaged = await runGitDiff(["diff", "--", filePath], cwd);
  const staged = await runGitDiff(["diff", "--staged", "--", filePath], cwd);
  return {
    available: true,
    unstaged,
    staged
  };
}
const emitter = new EventEmitter();
function onAppEvent(event, listener) {
  emitter.on(event, listener);
  return () => emitter.off(event, listener);
}
function emitAppEvent(event) {
  emitter.emit(event);
}
let fileWatcher = null;
let gitWatcher = null;
let debounceTimer = null;
let pending = {
  workspace: false,
  git: false,
  diff: false
};
function schedule(events) {
  pending = {
    workspace: pending.workspace || Boolean(events.workspace),
    git: pending.git || Boolean(events.git),
    diff: pending.diff || Boolean(events.diff)
  };
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (pending.workspace) emitAppEvent("workspace:changed");
    if (pending.git) emitAppEvent("git:changed");
    if (pending.diff) emitAppEvent("diff:changed");
    pending = { workspace: false, git: false, diff: false };
    debounceTimer = null;
  }, 250);
}
async function stopWatchers() {
  if (fileWatcher) {
    await fileWatcher.close();
    fileWatcher = null;
  }
  if (gitWatcher) {
    await gitWatcher.close();
    gitWatcher = null;
  }
}
async function startWatchers(rootPath) {
  await stopWatchers();
  fileWatcher = chokidar.watch(rootPath, {
    ignored: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.next/**"
    ],
    ignoreInitial: true
  });
  fileWatcher.on("all", () => {
    schedule({ workspace: true, git: true, diff: true });
  });
  gitWatcher = chokidar.watch(path.join(rootPath, ".git"), {
    ignoreInitial: true,
    depth: 5
  });
  gitWatcher.on("all", () => {
    schedule({ git: true, diff: true });
  });
}
let store = { threads: [] };
function getStorePath() {
  return path.join(app.getPath("userData"), "threads.json");
}
async function loadStore() {
  try {
    const data = await fs.readFile(getStorePath(), "utf-8");
    store = JSON.parse(data);
  } catch {
    store = { threads: [] };
  }
}
async function saveStore() {
  await fs.writeFile(getStorePath(), JSON.stringify(store, null, 2), "utf-8");
}
async function initThread() {
  await loadStore();
}
async function listThreads(workspaceId) {
  return store.threads.filter((t) => t.workspaceId === workspaceId).sort((a, b) => b.updatedAt - a.updatedAt);
}
async function createThread(workspaceId, title) {
  const now = Date.now();
  const thread = {
    id: randomUUID(),
    workspaceId,
    title,
    createdAt: now,
    updatedAt: now
  };
  store.threads.push(thread);
  await saveStore();
  return thread;
}
async function renameThread(id, title) {
  const thread = store.threads.find((t) => t.id === id);
  if (!thread) return null;
  thread.title = title;
  thread.updatedAt = Date.now();
  await saveStore();
  return thread;
}
async function removeThread(id) {
  const index = store.threads.findIndex((t) => t.id === id);
  if (index === -1) return false;
  store.threads.splice(index, 1);
  await saveStore();
  return true;
}
const commandRegistry = [
  {
    name: "help",
    syntax: "/help",
    description: "Show supported slash commands and usage.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "clear",
    syntax: "/clear",
    description: "Clear the current composer draft context.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "model",
    syntax: "/model <model>",
    description: "Override the Claude model for subsequent requests.",
    minArgs: 1,
    maxArgs: 1,
    allowFlags: false
  },
  {
    name: "compact",
    syntax: "/compact",
    description: "Request concise output style.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "review",
    syntax: "/review",
    description: "Switch to review-oriented response behavior.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "plan",
    syntax: "/plan",
    description: "Switch to planning-oriented response behavior.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "status",
    syntax: "/status",
    description: "Request current workspace status behavior.",
    minArgs: 0,
    maxArgs: 0,
    allowFlags: false
  },
  {
    name: "diff",
    syntax: "/diff [target]",
    description: "Request diff-focused behavior for optional target path.",
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false
  },
  {
    name: "test",
    syntax: "/test [scope]",
    description: "Request test-focused behavior for optional scope.",
    minArgs: 0,
    maxArgs: 1,
    allowFlags: false
  }
];
const commandByName = new Map(
  commandRegistry.map((definition) => [definition.name, definition])
);
function listCommands() {
  return commandRegistry;
}
function getCommand(name) {
  return commandByName.get(name) ?? null;
}
function parseArgs(raw) {
  const args = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    args.push(current);
  }
  return args;
}
function pushDiagnostic(diagnostics, code, message, start, end) {
  diagnostics.push({
    code,
    message,
    severity: "error",
    blocking: true,
    start,
    end
  });
}
function isMentionBoundary(rawInput, atIndex) {
  const prev = rawInput[atIndex - 1];
  if (!prev) return true;
  return /\s|[([{,]/.test(prev);
}
function parseMentionQueries(rawInput) {
  const mentionQueries = [];
  const mentionPattern = /@([A-Za-z0-9_./-]+)/g;
  for (const match of rawInput.matchAll(mentionPattern)) {
    const start = match.index ?? -1;
    if (start < 0 || !isMentionBoundary(rawInput, start)) continue;
    const raw = match[0];
    const query = match[1];
    mentionQueries.push({ raw, query, start, end: start + raw.length });
  }
  return mentionQueries;
}
function buildTokens(rawInput, command, mentions) {
  const chunks = [];
  const special = [];
  if (command) {
    special.push({
      kind: "command",
      raw: command.raw,
      start: command.start,
      end: command.end
    });
  }
  for (const mention of mentions) {
    special.push({
      kind: "mention",
      raw: mention.raw,
      start: mention.start,
      end: mention.end
    });
  }
  special.sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const token of special) {
    if (token.start > cursor) {
      chunks.push({
        kind: "text",
        raw: rawInput.slice(cursor, token.start),
        start: cursor,
        end: token.start
      });
    }
    chunks.push(token);
    cursor = token.end;
  }
  if (cursor < rawInput.length) {
    chunks.push({
      kind: "text",
      raw: rawInput.slice(cursor),
      start: cursor,
      end: rawInput.length
    });
  }
  return chunks;
}
function parseComposerInput(rawInput) {
  const diagnostics = [];
  const mentionQueries = parseMentionQueries(rawInput);
  let command = null;
  const normalizedPrompt = rawInput.trim();
  const firstNonWhitespace = rawInput.search(/\S/);
  if (firstNonWhitespace >= 0 && rawInput[firstNonWhitespace] === "/") {
    const tail = rawInput.slice(firstNonWhitespace);
    const spaceIndex = tail.search(/\s/);
    const commandToken = spaceIndex < 0 ? tail : tail.slice(0, spaceIndex);
    const commandName = commandToken.slice(1).toLowerCase();
    const argsRaw = spaceIndex < 0 ? "" : tail.slice(spaceIndex + 1).trim();
    const args = parseArgs(argsRaw);
    const def = getCommand(commandName);
    if (!def) {
      pushDiagnostic(
        diagnostics,
        "CMD_UNKNOWN",
        `Unknown command "/${commandName}".`,
        firstNonWhitespace,
        firstNonWhitespace + commandToken.length
      );
    } else {
      command = {
        name: def.name,
        args,
        raw: commandToken,
        start: firstNonWhitespace,
        end: firstNonWhitespace + commandToken.length
      };
      if (!def.allowFlags && args.some((arg) => arg.startsWith("-"))) {
        pushDiagnostic(
          diagnostics,
          "CMD_UNSUPPORTED_FLAG",
          `Command "/${def.name}" does not support flags.`,
          firstNonWhitespace,
          rawInput.length
        );
      } else if (args.length < def.minArgs || args.length > def.maxArgs) {
        pushDiagnostic(
          diagnostics,
          "CMD_INVALID_ARGS",
          `Invalid arguments for "/${def.name}". Expected syntax: ${def.syntax}.`,
          firstNonWhitespace,
          rawInput.length
        );
      }
    }
  }
  return {
    tokens: buildTokens(rawInput, command, mentionQueries),
    command,
    mentionQueries,
    diagnostics,
    normalizedPrompt
  };
}
const cache = /* @__PURE__ */ new Map();
const ignoredDirectories = /* @__PURE__ */ new Set([".git", "node_modules", "dist", "build", "coverage", ".next", "out"]);
const MAX_INDEX_FILES = 8e3;
const CACHE_TTL_MS = 1e4;
function toPosixPath(value) {
  return value.split(path.sep).join("/");
}
function isPathInsideWorkspace(workspaceRoot, candidatePath) {
  const relative = path.relative(workspaceRoot, candidatePath);
  return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
}
async function buildWorkspaceIndex(workspaceId, workspacePath) {
  const entries = [];
  const stack = [workspacePath];
  while (stack.length > 0 && entries.length < MAX_INDEX_FILES) {
    const current = stack.pop();
    if (!current) continue;
    let children = [];
    try {
      children = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const child of children) {
      if (child.name.startsWith(".")) continue;
      const absolutePath = path.join(current, child.name);
      if (child.isDirectory()) {
        if (ignoredDirectories.has(child.name)) continue;
        stack.push(absolutePath);
        continue;
      }
      if (!child.isFile()) continue;
      const relativePath = toPosixPath(path.relative(workspacePath, absolutePath));
      entries.push({
        kind: "mention",
        id: `${workspaceId}:${relativePath}`,
        display: relativePath,
        value: relativePath,
        absolutePath,
        relativePath
      });
      if (entries.length >= MAX_INDEX_FILES) break;
    }
  }
  cache.set(workspaceId, { entries, builtAt: Date.now() });
  return entries;
}
async function getWorkspaceIndex(workspaceId, workspacePath) {
  const hit = cache.get(workspaceId);
  if (hit && Date.now() - hit.builtAt < CACHE_TTL_MS) {
    return hit.entries;
  }
  return buildWorkspaceIndex(workspaceId, workspacePath);
}
async function suggestMentions(workspaceId, workspacePath, query) {
  const entries = await getWorkspaceIndex(workspaceId, workspacePath);
  const normalized = query.toLowerCase();
  if (!normalized) {
    return entries.slice(0, 20);
  }
  const startsWith = entries.filter((entry) => entry.relativePath.toLowerCase().startsWith(normalized));
  const includes = entries.filter(
    (entry) => !entry.relativePath.toLowerCase().startsWith(normalized) && entry.relativePath.toLowerCase().includes(normalized)
  );
  return [...startsWith, ...includes].slice(0, 20);
}
async function resolveMention(workspaceId, workspacePath, query) {
  const normalized = query.replace(/^\.?\//, "");
  const directPath = path.resolve(workspacePath, normalized);
  if (!isPathInsideWorkspace(workspacePath, directPath)) {
    return { mention: null, reason: "outside-workspace" };
  }
  try {
    const stat = await fs.stat(directPath);
    if (stat.isFile()) {
      const relativePath = toPosixPath(path.relative(workspacePath, directPath));
      return {
        mention: {
          id: `${workspaceId}:${relativePath}`,
          type: "file",
          workspaceId,
          absolutePath: directPath,
          relativePath,
          display: relativePath
        }
      };
    }
  } catch {
  }
  const matches = await suggestMentions(workspaceId, workspacePath, normalized);
  const best = matches.find((entry) => entry.relativePath.toLowerCase() === normalized.toLowerCase()) ?? matches[0];
  if (!best) {
    return { mention: null, reason: "unresolved" };
  }
  return {
    mention: {
      id: best.id,
      type: "file",
      workspaceId,
      absolutePath: best.absolutePath,
      relativePath: best.relativePath,
      display: best.display
    }
  };
}
async function getWorkspacePathById(workspaceId) {
  const workspaces = await listWorkspaces();
  return workspaces.find((workspace) => workspace.id === workspaceId)?.path ?? null;
}
function getCommandSuggestions(query) {
  const normalized = query.toLowerCase();
  return listCommands().filter((command) => command.name.startsWith(normalized)).map((command) => ({
    kind: "command",
    name: command.name,
    syntax: command.syntax,
    description: command.description
  }));
}
function detectSuggestionContext(rawInput, cursor) {
  const prefix = rawInput.slice(0, Math.max(0, Math.min(cursor, rawInput.length)));
  const mentionMatch = prefix.match(/(?:^|\s)@([A-Za-z0-9_./-]*)$/);
  if (mentionMatch) {
    return { context: "mention", query: mentionMatch[1] };
  }
  const commandMatch = prefix.match(/^\s*\/([A-Za-z0-9-]*)$/);
  if (commandMatch) {
    return { context: "command", query: commandMatch[1] };
  }
  return { context: "none", query: "" };
}
async function suggestComposer(input) {
  const context = detectSuggestionContext(input.rawInput, input.cursor);
  if (context.context === "none") {
    return { context: "none", query: "", suggestions: [] };
  }
  if (context.context === "command") {
    return {
      context: "command",
      query: context.query,
      suggestions: getCommandSuggestions(context.query)
    };
  }
  const workspacePath = await getWorkspacePathById(input.workspaceId);
  if (!workspacePath) {
    return { context: "mention", query: context.query, suggestions: [] };
  }
  const suggestions = await suggestMentions(input.workspaceId, workspacePath, context.query);
  return {
    context: "mention",
    query: context.query,
    suggestions
  };
}
async function resolveMentions(workspaceId, workspacePath, mentionQueries) {
  const diagnostics = [];
  const mentions = [];
  const seen = /* @__PURE__ */ new Set();
  for (const query of mentionQueries) {
    const result = await resolveMention(workspaceId, workspacePath, query.query);
    if (result.mention) {
      if (!seen.has(result.mention.id)) {
        seen.add(result.mention.id);
        mentions.push(result.mention);
      }
      continue;
    }
    if (result.reason === "outside-workspace") {
      diagnostics.push({
        code: "MENTION_OUTSIDE_WORKSPACE",
        severity: "error",
        message: `Mention "@${query.query}" is outside the current workspace.`,
        start: query.start,
        end: query.end,
        blocking: true
      });
      continue;
    }
    diagnostics.push({
      code: "MENTION_UNRESOLVED",
      severity: "error",
      message: `Unable to resolve mention "@${query.query}".`,
      start: query.start,
      end: query.end,
      blocking: true
    });
  }
  return { mentions, diagnostics };
}
async function prepareComposer(input) {
  const draft = parseComposerInput(input.rawInput);
  const diagnostics = [...draft.diagnostics];
  let mentions = [];
  const workspacePath = await getWorkspacePathById(input.workspaceId);
  if (!workspacePath) {
    diagnostics.push({
      code: "PARSE_SYNTAX",
      severity: "error",
      message: "No active workspace was found for this composer action.",
      start: 0,
      end: input.rawInput.length,
      blocking: true
    });
  } else {
    const mentionResult = await resolveMentions(input.workspaceId, workspacePath, draft.mentionQueries);
    mentions = mentionResult.mentions;
    diagnostics.push(...mentionResult.diagnostics);
  }
  return {
    rawInput: input.rawInput,
    tokens: draft.tokens,
    command: draft.command,
    mentions,
    normalizedPrompt: draft.normalizedPrompt,
    diagnostics,
    blocking: diagnostics.some((diagnostic) => diagnostic.blocking)
  };
}
function providerUnavailable(message) {
  return {
    ok: false,
    provider: "claude-code",
    diagnostics: [
      {
        code: "PROVIDER_UNAVAILABLE",
        severity: "error",
        message,
        start: 0,
        end: 0,
        blocking: true
      }
    ],
    action: "none"
  };
}
function providerError(code, message) {
  return {
    ok: false,
    provider: "claude-code",
    diagnostics: [
      {
        code,
        severity: "error",
        message,
        start: 0,
        end: 0,
        blocking: true
      }
    ],
    action: "none"
  };
}
function buildPrompt(request) {
  const { parseResult } = request;
  const command = parseResult.command;
  const lines = [];
  if (command) {
    const argsText = command.args.join(" ").trim();
    switch (command.name) {
      case "compact":
        lines.push("Respond concisely.");
        break;
      case "review":
        lines.push("Perform a review-style response focused on issues, risks, and missing tests.");
        break;
      case "plan":
        lines.push("Provide an implementation plan with clear steps.");
        break;
      case "status":
        lines.push("Summarize the current workspace status.");
        break;
      case "diff":
        lines.push(argsText ? `Focus on diff analysis for target: ${argsText}.` : "Focus on relevant git diff analysis.");
        break;
      case "test":
        lines.push(argsText ? `Focus on testing scope: ${argsText}.` : "Focus on test strategy and validation.");
        break;
    }
  }
  if (parseResult.mentions.length > 0) {
    lines.push(
      `Referenced files:
${parseResult.mentions.map((mention) => `- ${mention.relativePath}`).join("\n")}`
    );
  }
  let userPrompt = parseResult.normalizedPrompt;
  if (command) {
    const prefix = `/${command.name}`;
    if (userPrompt.startsWith(prefix)) {
      userPrompt = userPrompt.slice(prefix.length).trim();
    }
  }
  if (userPrompt) {
    lines.push(`User request:
${userPrompt}`);
  }
  return lines.join("\n\n").trim();
}
async function executeClaudeRequest(request) {
  const prompt = buildPrompt(request);
  if (!prompt) {
    return providerUnavailable("Composer prompt is empty after normalization.");
  }
  const args = ["-p", "--output-format", "json"];
  if (request.modelOverride) {
    args.push("--model", request.modelOverride);
  }
  args.push(prompt);
  try {
    const result = await execa("claude", args, {
      cwd: request.workspacePath,
      reject: false,
      timeout: 12e4
    });
    const raw = result.stdout.trim() || result.stderr.trim();
    if (!raw) {
      return providerUnavailable("Claude Code returned an empty response.");
    }
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
    if (payload?.is_error) {
      const errorMessage = payload.result ?? "Claude Code returned an error response.";
      const normalized = errorMessage.toLowerCase();
      if (normalized.includes("invalid_model")) {
        return providerError("CMD_INVALID_ARGS", errorMessage);
      }
      if (normalized.includes("auth") || normalized.includes("token")) {
        return providerError("PROVIDER_AUTH_REQUIRED", errorMessage);
      }
      return providerUnavailable(errorMessage);
    }
    return {
      ok: true,
      provider: "claude-code",
      output: payload?.result ?? raw,
      action: "none"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Claude Code execution failure.";
    return providerUnavailable(`Failed to execute Claude Code CLI: ${message}`);
  }
}
async function executeComposerRequest(request) {
  const command = request.parseResult.command;
  if (command?.name === "help") {
    return {
      ok: true,
      provider: "local",
      output: "/help, /clear, /model <model>, /compact, /review, /plan, /status, /diff [target], /test [scope]",
      action: "none"
    };
  }
  if (command?.name === "clear") {
    return {
      ok: true,
      provider: "local",
      output: "",
      action: "clear"
    };
  }
  if (command?.name === "model") {
    return {
      ok: true,
      provider: "local",
      output: `Model override set to ${command.args[0]}.`,
      modelOverride: command.args[0],
      action: "none"
    };
  }
  return executeClaudeRequest(request);
}
let eventsBound = false;
function broadcast(event) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(event);
  }
}
async function refreshWatchers() {
  const current = await getCurrentWorkspace();
  if (!current) {
    await stopWatchers();
    return;
  }
  await startWatchers(current.path);
}
function registerIpc() {
  if (!eventsBound) {
    eventsBound = true;
    onAppEvent("workspace:changed", () => broadcast("workspace:changed"));
    onAppEvent("git:changed", () => broadcast("git:changed"));
    onAppEvent("diff:changed", () => broadcast("diff:changed"));
  }
  ipcMain.handle("ping", async () => {
    return "pong from main";
  });
  ipcMain.handle("workspace:list", async () => {
    return listWorkspaces();
  });
  ipcMain.handle("workspace:recent", async (_event, limit) => {
    return listRecentWorkspaces(limit ?? 5);
  });
  ipcMain.handle(
    "workspace:discover",
    async (_event, options) => {
      return discoverGitWorkspaces(options);
    }
  );
  ipcMain.handle("workspace:ignored:list", async () => {
    return listIgnoredWorkspaces();
  });
  ipcMain.handle("workspace:ignored:add", async (_event, dirPath) => {
    return ignoreWorkspacePath(dirPath);
  });
  ipcMain.handle("workspace:ignored:remove", async (_event, dirPath) => {
    return restoreIgnoredWorkspace(dirPath);
  });
  ipcMain.handle("workspace:current", async () => {
    return getCurrentWorkspace();
  });
  ipcMain.handle("workspace:add", async (_event, dirPath) => {
    const entry = await addWorkspace(dirPath);
    await refreshWatchers();
    emitAppEvent("workspace:changed");
    emitAppEvent("git:changed");
    emitAppEvent("diff:changed");
    return entry;
  });
  ipcMain.handle("workspace:pick", async () => {
    const entry = await pickWorkspace();
    await refreshWatchers();
    emitAppEvent("workspace:changed");
    emitAppEvent("git:changed");
    emitAppEvent("diff:changed");
    return entry;
  });
  ipcMain.handle("workspace:set", async (_event, id) => {
    const entry = await setCurrentWorkspace(id);
    await refreshWatchers();
    emitAppEvent("workspace:changed");
    emitAppEvent("git:changed");
    emitAppEvent("diff:changed");
    return entry;
  });
  ipcMain.handle("workspace:rename", async (_event, id, name) => {
    const entry = await renameWorkspace(id, name);
    emitAppEvent("workspace:changed");
    return entry;
  });
  ipcMain.handle("workspace:remove", async (_event, id) => {
    const result = await removeWorkspace(id);
    await refreshWatchers();
    emitAppEvent("workspace:changed");
    emitAppEvent("git:changed");
    emitAppEvent("diff:changed");
    return result;
  });
  ipcMain.handle("git:summary", async () => {
    return getGitSummary();
  });
  ipcMain.handle("git:status", async () => {
    return getGitStatus();
  });
  ipcMain.handle("git:files", async () => {
    return getGitFileStatuses();
  });
  ipcMain.handle("diff:current", async () => {
    return getDiff();
  });
  ipcMain.handle("diff:file", async (_event, filePath) => {
    return getDiffForFile(filePath);
  });
  ipcMain.handle("thread:list", async (_event, workspaceId) => {
    return listThreads(workspaceId);
  });
  ipcMain.handle("thread:create", async (_event, workspaceId, title) => {
    return createThread(workspaceId, title);
  });
  ipcMain.handle("thread:rename", async (_event, id, title) => {
    return renameThread(id, title);
  });
  ipcMain.handle("thread:remove", async (_event, id) => {
    return removeThread(id);
  });
  ipcMain.handle("composer:suggest", async (_event, input) => {
    return suggestComposer(input);
  });
  ipcMain.handle("composer:prepare", async (_event, input) => {
    return prepareComposer(input);
  });
  ipcMain.handle("composer:execute", async (_event, input) => {
    const parseResult = await prepareComposer(input);
    if (parseResult.blocking) {
      return {
        ok: false,
        provider: "local",
        action: "none",
        diagnostics: parseResult.diagnostics
      };
    }
    const workspacePath = await getWorkspacePathById(input.workspaceId);
    if (!workspacePath) {
      return {
        ok: false,
        provider: "local",
        action: "none",
        diagnostics: [
          {
            code: "PARSE_SYNTAX",
            severity: "error",
            message: "No active workspace found.",
            start: 0,
            end: input.rawInput.length,
            blocking: true
          }
        ]
      };
    }
    return executeComposerRequest({
      workspaceId: input.workspaceId,
      workspacePath,
      threadId: input.threadId,
      parseResult,
      modelOverride: input.modelOverride
    });
  });
  refreshWatchers().catch(() => {
  });
}
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL;
const fallbackDevServerUrl = "http://127.0.0.1:5173";
const isDev = Boolean(devServerUrl);
const minimumSplashMs = 900;
let mainWindow = null;
let splashWindow = null;
function getSplashHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>open-app</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 100vw;
        height: 100vh;
        display: grid;
        place-items: center;
        font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f0f10;
        color: #e8e8e8;
        overflow: hidden;
      }
      .logo {
        font-size: 36px;
        font-weight: 600;
        letter-spacing: -0.02em;
        animation: splash-in 320ms ease-out forwards, splash-out 280ms ease-in 560ms forwards;
      }
      @keyframes splash-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes splash-out {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(1.03); }
      }
    </style>
  </head>
  <body>
    <div class="logo">open-app</div>
  </body>
</html>`;
}
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 360,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: "#0f0f10",
    show: true
  });
  splashWindow.setMenuBarVisibility(false);
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`);
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}
function createWindow() {
  const preloadMjs = path.join(__dirname, "../preload/index.mjs");
  const preloadJs = path.join(__dirname, "../preload/index.js");
  const preloadPath = fs$1.existsSync(preloadMjs) ? preloadMjs : preloadJs;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: "#0f0f10",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    const url = devServerUrl ?? fallbackDevServerUrl;
    mainWindow.loadURL(url);
  } else {
    const indexHtml = path.join(__dirname, "../renderer/index.html");
    mainWindow.loadFile(indexHtml);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
async function createStartupWindows() {
  const startupAt = Date.now();
  createSplashWindow();
  const window = createWindow();
  await new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.webContents.once("did-finish-load", finish);
    window.webContents.once("did-fail-load", finish);
  });
  const elapsed = Date.now() - startupAt;
  const waitMs = Math.max(0, minimumSplashMs - elapsed);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  if (!window.isDestroyed()) {
    window.show();
    if (isDev) {
      window.webContents.openDevTools({ mode: "detach" });
    }
  }
}
async function initModules() {
  initWorkspace();
  await initThread();
  registerIpc();
}
app.whenReady().then(async () => {
  await initModules();
  await createStartupWindows();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createStartupWindows();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
//# sourceMappingURL=index.js.map
