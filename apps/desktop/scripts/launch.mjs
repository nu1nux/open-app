import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import chokidar from 'chokidar';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const require = createRequire(import.meta.url);
const electronPath = require('electron');

const devServerUrl = 'http://127.0.0.1:5173';
let electronProcess = null;
let restarting = false;

async function startElectron() {
  if (electronProcess) {
    electronProcess.kill();
  }

  electronProcess = spawn(electronPath, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
      NODE_ENV: 'development'
    }
  });

  electronProcess.on('exit', () => {
    if (!restarting) {
      process.exit(0);
    }
  });
}

async function run() {
  await waitOn({ resources: [devServerUrl, path.join(root, 'dist/main/index.js')] });
  await startElectron();

  const watcher = chokidar.watch([
    path.join(root, 'dist/main/index.js'),
    path.join(root, 'dist/preload/index.js')
  ]);

  watcher.on('change', async () => {
    if (restarting) return;
    restarting = true;
    await startElectron();
    restarting = false;
  });
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
