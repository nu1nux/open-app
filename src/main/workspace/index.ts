/**
 * @fileoverview Workspace management module for handling user workspaces.
 * Provides functionality for creating, listing, removing, and discovering workspaces.
 * Stores workspace state in a JSON file in the user data directory.
 * @module main/workspace
 */

import { app, BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Represents a workspace entry stored in the application.
 */
export type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

/**
 * Represents a workspace discovered during filesystem scanning.
 */
export type DiscoveredWorkspace = {
  name: string;
  path: string;
  lastModifiedAt: string;
};

/**
 * Internal state structure for workspace management.
 */
type WorkspaceState = {
  currentId: string | null;
  entries: WorkspaceEntry[];
  ignoredPaths: string[];
};

/** Current workspace state held in memory */
const state: WorkspaceState = {
  currentId: null,
  entries: [],
  ignoredPaths: []
};

/** Promise that resolves when state is loaded */
let ready: Promise<void> = Promise.resolve();

/**
 * Gets the file path for storing workspace state.
 * @returns {string} Path to workspaces.json in user data directory
 */
function getStorePath() {
  return path.join(app.getPath('userData'), 'workspaces.json');
}

/**
 * Loads workspace state from the persistent storage file.
 * Initializes empty state if the file doesn't exist or is invalid.
 * @returns {Promise<void>}
 */
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

/**
 * Saves the current workspace state to the persistent storage file.
 * @returns {Promise<void>}
 */
async function saveState() {
  const payload: WorkspaceState = {
    currentId: state.currentId,
    entries: state.entries,
    ignoredPaths: state.ignoredPaths
  };
  await fs.writeFile(getStorePath(), JSON.stringify(payload, null, 2), 'utf-8');
}

/**
 * Finds a workspace entry by its directory path.
 * @param {string} dirPath - The directory path to search for
 * @returns {WorkspaceEntry | null} The matching workspace entry or null
 */
function findEntryByPath(dirPath: string) {
  return state.entries.find((entry) => entry.path === dirPath) ?? null;
}

/**
 * Gets a workspace entry by its unique identifier.
 * @param {string | null} id - The workspace ID to search for
 * @returns {WorkspaceEntry | null} The matching workspace entry or null
 */
function getEntryById(id: string | null) {
  if (!id) return null;
  return state.entries.find((entry) => entry.id === id) ?? null;
}

/**
 * Ensures the workspace state has been loaded before operations.
 * @returns {Promise<void>}
 */
async function ensureReady() {
  await ready;
}

/**
 * Initializes the workspace module by loading saved state.
 */
export function initWorkspace() {
  ready = loadState();
}

/**
 * Lists all workspaces sorted by last opened date (most recent first).
 * @returns {Promise<WorkspaceEntry[]>} Array of workspace entries
 */
export async function listWorkspaces() {
  await ensureReady();
  return [...state.entries].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

/**
 * Lists the most recently opened workspaces.
 * @param {number} [limit=5] - Maximum number of workspaces to return
 * @returns {Promise<WorkspaceEntry[]>} Array of recent workspace entries
 */
export async function listRecentWorkspaces(limit = 5) {
  const list = await listWorkspaces();
  return list.slice(0, limit);
}

/**
 * Gets the currently active workspace.
 * @returns {Promise<WorkspaceEntry | null>} The current workspace entry or null
 */
export async function getCurrentWorkspace() {
  await ensureReady();
  return getEntryById(state.currentId);
}

/**
 * Sets the current workspace by ID and updates its last opened timestamp.
 * @param {string} id - The workspace ID to set as current
 * @returns {Promise<WorkspaceEntry | null>} The updated workspace entry or null if not found
 */
export async function setCurrentWorkspace(id: string) {
  await ensureReady();
  const entry = getEntryById(id);
  if (!entry) return null;
  state.currentId = entry.id;
  entry.lastOpenedAt = new Date().toISOString();
  await saveState();
  return entry;
}

/**
 * Adds a new workspace or updates an existing one if the path already exists.
 * Removes the path from ignored list if present.
 * @param {string} dirPath - The directory path to add as a workspace
 * @returns {Promise<WorkspaceEntry>} The created or updated workspace entry
 */
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

/**
 * Renames a workspace.
 * @param {string} id - The workspace ID to rename
 * @param {string} name - The new name for the workspace
 * @returns {Promise<WorkspaceEntry | null>} The updated workspace entry or null if not found
 */
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

/**
 * Removes a workspace by ID.
 * If the removed workspace was current, sets the first available workspace as current.
 * @param {string} id - The workspace ID to remove
 * @returns {Promise<{removed: boolean, current: WorkspaceEntry | null}>} Result with removal status and new current workspace
 */
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

/**
 * Lists all ignored workspace paths.
 * @returns {Promise<string[]>} Array of ignored directory paths
 */
export async function listIgnoredWorkspaces() {
  await ensureReady();
  return [...state.ignoredPaths];
}

/**
 * Adds a path to the ignored workspaces list.
 * @param {string} pathToIgnore - The directory path to ignore
 * @returns {Promise<string[]>} Updated array of ignored paths
 */
export async function ignoreWorkspacePath(pathToIgnore: string) {
  await ensureReady();
  if (!state.ignoredPaths.includes(pathToIgnore)) {
    state.ignoredPaths.push(pathToIgnore);
    await saveState();
  }
  return [...state.ignoredPaths];
}

/**
 * Removes a path from the ignored workspaces list.
 * @param {string} pathToRestore - The directory path to restore
 * @returns {Promise<string[]>} Updated array of ignored paths
 */
export async function restoreIgnoredWorkspace(pathToRestore: string) {
  await ensureReady();
  state.ignoredPaths = state.ignoredPaths.filter((value) => value !== pathToRestore);
  await saveState();
  return [...state.ignoredPaths];
}

/** Default directories to search for git repositories */
const DEFAULT_DISCOVERY_DIRS = ['Desktop', 'Documents', 'Projects', 'Code', 'workspace', 'dev'];
/** Directories to ignore during workspace discovery */
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);

/**
 * Discovers git repositories in the filesystem.
 * Searches through specified root directories or default locations.
 * @param {Object} [options] - Discovery options
 * @param {string[]} [options.roots] - Root directories to search in
 * @param {number} [options.maxDepth=4] - Maximum directory depth to traverse
 * @param {number} [options.limit=50] - Maximum number of repositories to return
 * @param {boolean} [options.includeIgnored=false] - Whether to include ignored paths
 * @returns {Promise<DiscoveredWorkspace[]>} Array of discovered workspaces
 */
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

/**
 * Opens a native directory picker dialog to select a workspace.
 * @returns {Promise<WorkspaceEntry | null>} The selected workspace entry or null if canceled
 */
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

/**
 * Gets the directory path of the current workspace.
 * @returns {Promise<string | null>} The current workspace path or null
 */
export async function getCurrentWorkspacePath() {
  const entry = await getCurrentWorkspace();
  return entry?.path ?? null;
}
