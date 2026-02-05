import { build, context } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  sourcemap: true,
  platform: 'node',
  target: 'node18',
  external: ['electron'],
};

const mainConfig = {
  ...shared,
  entryPoints: [path.join(root, 'main/index.ts')],
  outfile: path.join(root, 'dist/main/index.js'),
};

const preloadConfig = {
  ...shared,
  entryPoints: [path.join(root, 'preload/index.ts')],
  outfile: path.join(root, 'dist/preload/index.js'),
};

async function run() {
  if (!watch) {
    await build(mainConfig);
    await build(preloadConfig);
    return;
  }

  const mainCtx = await context(mainConfig);
  const preloadCtx = await context(preloadConfig);
  await mainCtx.watch();
  await preloadCtx.watch();

  // Keep process alive.
  await new Promise(() => {});
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
