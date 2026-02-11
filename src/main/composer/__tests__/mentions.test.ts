import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveMention, suggestMentions } from '../mentions';

async function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}

describe('mention providers', () => {
  const workspaces: string[] = [];

  afterEach(async () => {
    await Promise.all(
      workspaces.map(async (workspacePath) => {
        await fs.rm(workspacePath, { recursive: true, force: true });
      })
    );
    workspaces.length = 0;
  });

  it('excludes files ignored by .gitignore from file suggestions', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-mentions-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, '.gitignore', 'dist/\n');
    await writeFile(workspacePath, 'dist/main.js', 'console.log("dist");\n');
    await writeFile(workspacePath, 'src/main.ts', 'export const value = 1;\n');

    const suggestions = await suggestMentions('workspace-1', workspacePath, 'dist');
    expect(suggestions.some((entry) => entry.relativePath === 'dist/main.js')).toBe(false);
  });

  it('returns directory suggestions for @src/', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-mentions-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, 'src/components/Button.tsx', 'export const Button = () => null;\n');
    await writeFile(workspacePath, 'src/main.ts', 'export const value = 1;\n');

    const suggestions = await suggestMentions('workspace-1', workspacePath, 'src/');
    expect(suggestions.some((entry) => entry.value === 'src/')).toBe(true);
  });

  it('returns image mention refs for png/jpeg files', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-mentions-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, 'assets/logo.png', 'png-data');

    const resolved = await resolveMention('workspace-1', workspacePath, 'assets/logo.png', 'image');
    expect(resolved.mention?.type).toBe('image');
  });
});
