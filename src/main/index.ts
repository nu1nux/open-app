/**
 * @fileoverview Main process entry point for the Electron desktop application.
 * Handles app lifecycle, window creation, and module initialization.
 * @module main
 */

import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { registerIpc } from './ipc';
import { initWorkspace, removeWorkspace } from './workspace';
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
import { initThread, removeThread } from './thread';
import { emitAppEvent } from './events';
import { initDeleteCoordinator } from './delete';

/** Development server URL from environment variables */
const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? process.env.ELECTRON_RENDERER_URL;
/** Fallback URL when dev server URL is not configured */
const fallbackDevServerUrl = 'http://127.0.0.1:5173';
/** Whether the app is running in development mode */
const isDev = Boolean(devServerUrl);
/** Minimum splash duration in milliseconds */
const minimumSplashMs = 900;
/** Reference to the main application window */
let mainWindow: BrowserWindow | null = null;
/** Reference to the splash window shown during startup */
let splashWindow: BrowserWindow | null = null;

/**
 * Creates and returns splash HTML for launch animation.
 */
function getSplashHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>open-app</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: 100vw;
        height: 100vh;
        display: grid;
        place-items: center;
        font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f0f10;
        color: #e8e8e8;
        overflow: hidden;
      }
      .logo {
        font-size: 36px;
        font-weight: 600;
        letter-spacing: -0.02em;
        animation: splash-in 320ms ease-out forwards, splash-out 280ms ease-in 560ms forwards;
      }
      @keyframes splash-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes splash-out {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(1.03); }
      }
    </style>
  </head>
  <body>
    <div class="logo">open-app</div>
  </body>
</html>`;
}

/**
 * Creates and configures the splash window shown on app launch.
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 560,
    height: 360,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#0f0f10',
    show: true
  });

  splashWindow.setMenuBarVisibility(false);
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`);
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

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
    show: false,
    backgroundColor: '#0f0f10',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    const url = devServerUrl ?? fallbackDevServerUrl;
    mainWindow.loadURL(url);
  } else {
    const indexHtml = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

/**
 * Creates startup windows and keeps splash visible until app shell is ready.
 */
async function createStartupWindows() {
  const startupAt = Date.now();
  createSplashWindow();
  const window = createWindow();

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    window.webContents.once('did-finish-load', finish);
    window.webContents.once('did-fail-load', finish);
  });

  const elapsed = Date.now() - startupAt;
  const waitMs = Math.max(0, minimumSplashMs - elapsed);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  if (!window.isDestroyed()) {
    window.show();
    if (isDev) {
      window.webContents.openDevTools({ mode: 'right' });
    }
  }
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
  await initThread();
  initDeleteCoordinator({
    commitThread: removeThread,
    commitWorkspace: removeWorkspace,
    onChanged: () => emitAppEvent('delete:changed')
  });
  registerIpc();
}

app.whenReady().then(async () => {
  await initModules();
  await createStartupWindows();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createStartupWindows();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
