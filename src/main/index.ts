/**
 * @fileoverview Main process entry point for the Electron desktop application.
 * Handles app lifecycle, window creation, and module initialization.
 * @module main
 */

import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
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

/** Development server URL from environment variables */
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL;
/** Fallback URL when dev server URL is not configured */
const fallbackDevServerUrl = 'http://127.0.0.1:5173';
/** Whether the app is running in development mode */
const isDev = Boolean(devServerUrl);
/** Reference to the main application window */
let mainWindow: BrowserWindow | null = null;

/**
 * Creates and configures the main application window.
 * Sets up preload script, window dimensions, and loads the appropriate content
 * based on development or production mode.
 */
function createWindow() {
  const preloadMjs = path.join(__dirname, '../preload/index.mjs');
  const preloadJs = path.join(__dirname, '../preload/index.js');
  const preloadPath = fs.existsSync(preloadMjs) ? preloadMjs : preloadJs;

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
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initializes all application modules.
 * Loads workspace, git, diff, scripts, testing, spotlight, todos,
 * checkpoints, integrations, providers, storage modules, and registers IPC handlers.
 * @returns {Promise<void>}
 */
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
