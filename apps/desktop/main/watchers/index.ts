import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import { emitAppEvent } from '../events';

let fileWatcher: FSWatcher | null = null;
let gitWatcher: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let pending = {
  workspace: false,
  git: false,
  diff: false
};

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
