import { app, BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

export type DiscoveredWorkspace = {
  name: string;
  path: string;
  lastModifiedAt: string;
};

type WorkspaceState = {
  currentId: string | null;
  entries: WorkspaceEntry[];
  ignoredPaths: string[];
};

const state: WorkspaceState = {
  currentId: null,
  entries: [],
  ignoredPaths: []
};

let ready: Promise<void> = Promise.resolve();

function getStorePath() {
  return path.join(app.getPath('userData'), 'workspaces.json');
}

async function loadState() {
  try {
    const data = await fs.readFile(getStorePath(), 'utf-8');
    const parsed = JSON.parse(data) as WorkspaceState;
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
  const payload: WorkspaceState = {
    currentId: state.currentId,
    entries: state.entries,
    ignoredPaths: state.ignoredPaths
  };
  await fs.writeFile(getStorePath(), JSON.stringify(payload, null, 2), 'utf-8');
}

function findEntryByPath(dirPath: string) {
  return state.entries.find((entry) => entry.path === dirPath) ?? null;
}

function getEntryById(id: string | null) {
  if (!id) return null;
  return state.entries.find((entry) => entry.id === id) ?? null;
}

async function ensureReady() {
  await ready;
}

export function initWorkspace() {
  ready = loadState();
}

export async function listWorkspaces() {
  await ensureReady();
  return [...state.entries].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export async function listRecentWorkspaces(limit = 5) {
  const list = await listWorkspaces();
  return list.slice(0, limit);
}

export async function getCurrentWorkspace() {
  await ensureReady();
  return getEntryById(state.currentId);
}

export async function setCurrentWorkspace(id: string) {
  await ensureReady();
  const entry = getEntryById(id);
  if (!entry) return null;
  state.currentId = entry.id;
  entry.lastOpenedAt = new Date().toISOString();
  await saveState();
  return entry;
}

export async function addWorkspace(dirPath: string) {
  await ensureReady();
  if (state.ignoredPaths.includes(dirPath)) {
    state.ignoredPaths = state.ignoredPaths.filter((path) => path !== dirPath);
  }
  const existing = findEntryByPath(dirPath);
  if (existing) {
    existing.lastOpenedAt = new Date().toISOString();
    state.currentId = existing.id;
    await saveState();
    return existing;
  }

  const entry: WorkspaceEntry = {
    id: randomUUID(),
    name: path.basename(dirPath),
    path: dirPath,
    lastOpenedAt: new Date().toISOString()
  };

  state.entries.push(entry);
  state.currentId = entry.id;
  await saveState();
  return entry;
}

export async function renameWorkspace(id: string, name: string) {
  await ensureReady();
  const entry = getEntryById(id);
  if (!entry) return null;

  const nextName = name.trim();
  if (!nextName) return null;

  entry.name = nextName;
  await saveState();
  return entry;
}

export async function removeWorkspace(id: string) {
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

export async function listIgnoredWorkspaces() {
  await ensureReady();
  return [...state.ignoredPaths];
}

export async function ignoreWorkspacePath(pathToIgnore: string) {
  await ensureReady();
  if (!state.ignoredPaths.includes(pathToIgnore)) {
    state.ignoredPaths.push(pathToIgnore);
    await saveState();
  }
  return [...state.ignoredPaths];
}

export async function restoreIgnoredWorkspace(pathToRestore: string) {
  await ensureReady();
  state.ignoredPaths = state.ignoredPaths.filter((value) => value !== pathToRestore);
  await saveState();
  return [...state.ignoredPaths];
}

const DEFAULT_DISCOVERY_DIRS = ['Desktop', 'Documents', 'Projects', 'Code', 'workspace', 'dev'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);

export async function discoverGitWorkspaces(options?: {
  roots?: string[];
  maxDepth?: number;
  limit?: number;
  includeIgnored?: boolean;
}): Promise<DiscoveredWorkspace[]> {
  const home = app.getPath('home');
  const roots = options?.roots ??
    (await Promise.all(
      DEFAULT_DISCOVERY_DIRS.map(async (dir) => {
        const full = path.join(home, dir);
        try {
          const stat = await fs.stat(full);
          return stat.isDirectory() ? full : null;
        } catch {
          return null;
        }
      })
    )).filter((value): value is string => Boolean(value));

  const maxDepth = options?.maxDepth ?? 4;
  const limit = options?.limit ?? 50;
  const discovered: DiscoveredWorkspace[] = [];
  const visited = new Set<string>();

  const isGitRepo = async (dirPath: string) => {
    try {
      const stat = await fs.stat(path.join(dirPath, '.git'));
      return stat.isDirectory();
    } catch {
      return false;
    }
  };

  const walk = async (dirPath: string, depth: number) => {
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
          lastModifiedAt: new Date().toISOString()
        });
      }
      return;
    }

    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isDirectory() || entry.isSymbolicLink()) return;
        if (IGNORE_DIRS.has(entry.name)) return;
        if (entry.name.startsWith('.')) return;
        await walk(path.join(dirPath, entry.name), depth - 1);
      })
    );
  };

  await Promise.all(roots.map((root) => walk(root, maxDepth)));

  const filtered = options?.includeIgnored
    ? discovered
    : discovered.filter((entry) => !state.ignoredPaths.includes(entry.path));

  return filtered
    .sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt))
    .slice(0, limit);
}

export async function pickWorkspace() {
  await ensureReady();
  const window = BrowserWindow.getFocusedWindow();
  const options: OpenDialogOptions = {
    properties: ['openDirectory'],
    title: 'Select a workspace folder'
  };

  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return addWorkspace(result.filePaths[0]);
}

export async function getCurrentWorkspacePath() {
  const entry = await getCurrentWorkspace();
  return entry?.path ?? null;
}
