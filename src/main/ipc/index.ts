import { BrowserWindow, ipcMain } from 'electron';
import {
  addWorkspace,
  getCurrentWorkspace,
  listRecentWorkspaces,
  listWorkspaces,
  discoverGitWorkspaces,
  pickWorkspace,
  removeWorkspace,
  ignoreWorkspacePath,
  listIgnoredWorkspaces,
  renameWorkspace,
  restoreIgnoredWorkspace,
  setCurrentWorkspace
} from '../workspace';
import { getGitSummary, getGitStatus, getGitFileStatuses } from '../git';
import { getDiff, getDiffForFile } from '../diff';
import { emitAppEvent, onAppEvent, type AppEvent } from '../events';
import { startWatchers, stopWatchers } from '../watchers';

let eventsBound = false;

function broadcast(event: AppEvent) {
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

export function registerIpc() {
  if (!eventsBound) {
    eventsBound = true;
    onAppEvent('workspace:changed', () => broadcast('workspace:changed'));
    onAppEvent('git:changed', () => broadcast('git:changed'));
    onAppEvent('diff:changed', () => broadcast('diff:changed'));
  }

  ipcMain.handle('ping', async () => {
    return 'pong from main';
  });

  ipcMain.handle('workspace:list', async () => {
    return listWorkspaces();
  });

  ipcMain.handle('workspace:recent', async (_event, limit?: number) => {
    return listRecentWorkspaces(limit ?? 5);
  });

  ipcMain.handle(
    'workspace:discover',
    async (
      _event,
      options?: { roots?: string[]; maxDepth?: number; limit?: number; includeIgnored?: boolean }
    ) => {
    return discoverGitWorkspaces(options);
    }
  );

  ipcMain.handle('workspace:ignored:list', async () => {
    return listIgnoredWorkspaces();
  });

  ipcMain.handle('workspace:ignored:add', async (_event, dirPath: string) => {
    return ignoreWorkspacePath(dirPath);
  });

  ipcMain.handle('workspace:ignored:remove', async (_event, dirPath: string) => {
    return restoreIgnoredWorkspace(dirPath);
  });

  ipcMain.handle('workspace:current', async () => {
    return getCurrentWorkspace();
  });

  ipcMain.handle('workspace:add', async (_event, dirPath: string) => {
    const entry = await addWorkspace(dirPath);
    await refreshWatchers();
    emitAppEvent('workspace:changed');
    emitAppEvent('git:changed');
    emitAppEvent('diff:changed');
    return entry;
  });

  ipcMain.handle('workspace:pick', async () => {
    const entry = await pickWorkspace();
    await refreshWatchers();
    emitAppEvent('workspace:changed');
    emitAppEvent('git:changed');
    emitAppEvent('diff:changed');
    return entry;
  });

  ipcMain.handle('workspace:set', async (_event, id: string) => {
    const entry = await setCurrentWorkspace(id);
    await refreshWatchers();
    emitAppEvent('workspace:changed');
    emitAppEvent('git:changed');
    emitAppEvent('diff:changed');
    return entry;
  });

  ipcMain.handle('workspace:rename', async (_event, id: string, name: string) => {
    const entry = await renameWorkspace(id, name);
    emitAppEvent('workspace:changed');
    return entry;
  });

  ipcMain.handle('workspace:remove', async (_event, id: string) => {
    const result = await removeWorkspace(id);
    await refreshWatchers();
    emitAppEvent('workspace:changed');
    emitAppEvent('git:changed');
    emitAppEvent('diff:changed');
    return result;
  });

  ipcMain.handle('git:summary', async () => {
    return getGitSummary();
  });

  ipcMain.handle('git:status', async () => {
    return getGitStatus();
  });

  ipcMain.handle('git:files', async () => {
    return getGitFileStatuses();
  });

  ipcMain.handle('diff:current', async () => {
    return getDiff();
  });

  ipcMain.handle('diff:file', async (_event, filePath: string) => {
    return getDiffForFile(filePath);
  });

  refreshWatchers().catch(() => {});
}
