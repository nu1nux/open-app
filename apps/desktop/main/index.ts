import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerIpc } from './ipc';
import { initWorkspace } from './workspace';
import { initGit } from './git';
import { initDiff } from './diff';
import { initScripts } from './scripts';
import { initTesting } from './testing';
import { initSpotlight } from './spotlight';
import { initTodos } from './todos';
import { initCheckpoints } from './checkpoints';
import { initIntegrations } from './integrations';
import { initProviders } from './providers';
import { initStorage } from './storage';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/index.js');

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
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '../../renderer/dist/index.html');
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function initModules() {
  initWorkspace();
  initGit();
  initDiff();
  initScripts();
  initTesting();
  initSpotlight();
  initTodos();
  initCheckpoints();
  initIntegrations();
  initProviders();
  initStorage();
  registerIpc();
}

app.whenReady().then(async () => {
  await initModules();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
