/**
 * @fileoverview IPC handler registration for main process communication.
 * Registers all IPC channels for workspace, git, and diff operations,
 * and broadcasts events to all renderer windows.
 * @module main/ipc
 */

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
import { listThreads, createThread, renameThread, removeThread } from '../thread';
import { prepareComposer, suggestComposer, getWorkspacePathById } from '../composer';
import { executeComposerRequest } from '../providers';
import type { ComposerPrepareInput, ComposerSuggestInput } from '../../shared/composer';

/** Flag to track if event listeners have been bound */
let eventsBound = false;

/**
 * Broadcasts an event to all open browser windows.
 * @param {AppEvent} event - The event name to broadcast
 */
function broadcast(event: AppEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(event);
  }
}

/**
 * Refreshes file system watchers based on the current workspace.
 * Stops existing watchers if no workspace is selected, or starts
 * new watchers for the current workspace path.
 * @returns {Promise<void>}
 */
async function refreshWatchers() {
  const current = await getCurrentWorkspace();
  if (!current) {
    await stopWatchers();
    return;
  }
  await startWatchers(current.path);
}

/**
 * Registers all IPC handlers for the main process.
 * Sets up handlers for workspace, git, and diff operations.
 * Also binds event listeners to broadcast changes to renderer windows.
 */
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

  ipcMain.handle('thread:list', async (_event, workspaceId: string) => {
    return listThreads(workspaceId);
  });

  ipcMain.handle('thread:create', async (_event, workspaceId: string, title: string) => {
    return createThread(workspaceId, title);
  });

  ipcMain.handle('thread:rename', async (_event, id: string, title: string) => {
    return renameThread(id, title);
  });

  ipcMain.handle('thread:remove', async (_event, id: string) => {
    return removeThread(id);
  });

  ipcMain.handle('composer:suggest', async (_event, input: ComposerSuggestInput) => {
    return suggestComposer(input);
  });

  ipcMain.handle('composer:prepare', async (_event, input: ComposerPrepareInput) => {
    return prepareComposer(input);
  });

  ipcMain.handle('composer:execute', async (_event, input: ComposerPrepareInput) => {
    const parseResult = await prepareComposer(input);
    if (parseResult.blocking) {
      return {
        ok: false,
        provider: 'local',
        action: 'none',
        diagnostics: parseResult.diagnostics
      };
    }

    const workspacePath = await getWorkspacePathById(input.workspaceId);
    if (!workspacePath) {
      return {
        ok: false,
        provider: 'local',
        action: 'none',
        diagnostics: [
          {
            code: 'PARSE_SYNTAX',
            severity: 'error',
            message: 'No active workspace found.',
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

  refreshWatchers().catch(() => {});
}
