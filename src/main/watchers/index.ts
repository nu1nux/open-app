/**
 * @fileoverview File system watchers for detecting workspace and git changes.
 * Uses chokidar to watch for file changes and emits debounced events.
 * @module main/watchers
 */

import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { emitAppEvent } from '../events';

/** File watcher for workspace files */
let fileWatcher: FSWatcher | null = null;
/** Watcher for .git directory changes */
let gitWatcher: FSWatcher | null = null;
/** Timer for debouncing event emissions */
let debounceTimer: NodeJS.Timeout | null = null;
/** Pending events to emit after debounce */
let pending = {
  workspace: false,
  git: false,
  diff: false
};

/**
 * Schedules events to be emitted after a debounce period.
 * Consolidates multiple rapid file changes into a single event emission.
 * @param {Partial<typeof pending>} events - Events to schedule for emission
 */
function schedule(events: Partial<typeof pending>) {
  pending = {
    workspace: pending.workspace || Boolean(events.workspace),
    git: pending.git || Boolean(events.git),
    diff: pending.diff || Boolean(events.diff)
  };

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (pending.workspace) emitAppEvent('workspace:changed');
    if (pending.git) emitAppEvent('git:changed');
    if (pending.diff) emitAppEvent('diff:changed');

    pending = { workspace: false, git: false, diff: false };
    debounceTimer = null;
  }, 250);
}

/**
 * Stops all active file system watchers.
 * @returns {Promise<void>}
 */
export async function stopWatchers() {
  if (fileWatcher) {
    await fileWatcher.close();
    fileWatcher = null;
  }
  if (gitWatcher) {
    await gitWatcher.close();
    gitWatcher = null;
  }
}

/**
 * Starts file system watchers for a workspace directory.
 * Watches for general file changes and git-specific changes separately.
 * @param {string} rootPath - Root directory path to watch
 * @returns {Promise<void>}
 */
export async function startWatchers(rootPath: string) {
  await stopWatchers();

  fileWatcher = chokidar.watch(rootPath, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.next/**'
    ],
    ignoreInitial: true
  });

  fileWatcher.on('all', () => {
    schedule({ workspace: true, git: true, diff: true });
  });

  gitWatcher = chokidar.watch(path.join(rootPath, '.git'), {
    ignoreInitial: true,
    depth: 5
  });

  gitWatcher.on('all', () => {
    schedule({ git: true, diff: true });
  });
}
