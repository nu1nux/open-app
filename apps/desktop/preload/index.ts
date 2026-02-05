import { contextBridge, ipcRenderer } from 'electron';

const validChannels = new Set(['workspace:changed', 'git:changed', 'diff:changed']);

type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed';

contextBridge.exposeInMainWorld('openApp', {
  ping: () => ipcRenderer.invoke('ping'),
  workspace: {
    list: () => ipcRenderer.invoke('workspace:list'),
    recent: (limit?: number) => ipcRenderer.invoke('workspace:recent', limit),
    discover: (options?: {
      roots?: string[];
      maxDepth?: number;
      limit?: number;
      includeIgnored?: boolean;
    }) =>
      ipcRenderer.invoke('workspace:discover', options),
    ignored: {
      list: () => ipcRenderer.invoke('workspace:ignored:list'),
      add: (dirPath: string) => ipcRenderer.invoke('workspace:ignored:add', dirPath),
      remove: (dirPath: string) => ipcRenderer.invoke('workspace:ignored:remove', dirPath)
    },
    current: () => ipcRenderer.invoke('workspace:current'),
    add: (dirPath: string) => ipcRenderer.invoke('workspace:add', dirPath),
    pick: () => ipcRenderer.invoke('workspace:pick'),
    set: (id: string) => ipcRenderer.invoke('workspace:set', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('workspace:rename', id, name),
    remove: (id: string) => ipcRenderer.invoke('workspace:remove', id)
  },
  git: {
    summary: () => ipcRenderer.invoke('git:summary'),
    status: () => ipcRenderer.invoke('git:status'),
    files: () => ipcRenderer.invoke('git:files')
  },
  diff: {
    current: () => ipcRenderer.invoke('diff:current'),
    file: (filePath: string) => ipcRenderer.invoke('diff:file', filePath)
  },
  events: {
    on: (channel: AppEvent, handler: () => void) => {
      if (!validChannels.has(channel)) return () => {};
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
});
