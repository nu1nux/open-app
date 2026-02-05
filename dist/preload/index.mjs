import { contextBridge, ipcRenderer } from "electron";
const validChannels = /* @__PURE__ */ new Set(["workspace:changed", "git:changed", "diff:changed"]);
contextBridge.exposeInMainWorld("openApp", {
  ping: () => ipcRenderer.invoke("ping"),
  workspace: {
    list: () => ipcRenderer.invoke("workspace:list"),
    recent: (limit) => ipcRenderer.invoke("workspace:recent", limit),
    discover: (options) => ipcRenderer.invoke("workspace:discover", options),
    ignored: {
      list: () => ipcRenderer.invoke("workspace:ignored:list"),
      add: (dirPath) => ipcRenderer.invoke("workspace:ignored:add", dirPath),
      remove: (dirPath) => ipcRenderer.invoke("workspace:ignored:remove", dirPath)
    },
    current: () => ipcRenderer.invoke("workspace:current"),
    add: (dirPath) => ipcRenderer.invoke("workspace:add", dirPath),
    pick: () => ipcRenderer.invoke("workspace:pick"),
    set: (id) => ipcRenderer.invoke("workspace:set", id),
    rename: (id, name) => ipcRenderer.invoke("workspace:rename", id, name),
    remove: (id) => ipcRenderer.invoke("workspace:remove", id)
  },
  git: {
    summary: () => ipcRenderer.invoke("git:summary"),
    status: () => ipcRenderer.invoke("git:status"),
    files: () => ipcRenderer.invoke("git:files")
  },
  diff: {
    current: () => ipcRenderer.invoke("diff:current"),
    file: (filePath) => ipcRenderer.invoke("diff:file", filePath)
  },
  events: {
    on: (channel, handler) => {
      if (!validChannels.has(channel)) return () => {
      };
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
});
//# sourceMappingURL=index.mjs.map
