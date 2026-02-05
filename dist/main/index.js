import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs$1 from "node:fs";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { EventEmitter } from "node:events";
import chokidar from "chokidar";
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
  refreshWatchers().catch(() => {
  });
}
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL;
const fallbackDevServerUrl = "http://127.0.0.1:5173";
const isDev = Boolean(devServerUrl);
let mainWindow = null;
function createWindow() {
  const preloadMjs = path.join(__dirname, "../preload/index.mjs");
  const preloadJs = path.join(__dirname, "../preload/index.js");
  const preloadPath = fs$1.existsSync(preloadMjs) ? preloadMjs : preloadJs;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    const url = devServerUrl ?? fallbackDevServerUrl;
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(__dirname, "../renderer/index.html");
    mainWindow.loadFile(indexHtml);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
async function initModules() {
  initWorkspace();
  await initThread();
  registerIpc();
}
app.whenReady().then(async () => {
  await initModules();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
//# sourceMappingURL=index.js.map
