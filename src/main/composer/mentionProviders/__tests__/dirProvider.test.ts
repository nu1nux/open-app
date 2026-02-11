import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dirMentionProvider } from '../dirProvider';

async function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}

describe('dirMentionProvider', () => {
  const workspaces: string[] = [];

  afterEach(async () => {
    await Promise.all(
      workspaces.map(async (workspacePath) => {
        await fs.rm(workspacePath, { recursive: true, force: true });
      })
    );
    workspaces.length = 0;
    vi.restoreAllMocks();
  });

  it('reuses cached directory index between suggestions', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-dir-provider-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, 'src/components/Button.tsx', 'export const Button = () => null;\n');
    await writeFile(workspacePath, 'src/main.ts', 'export const value = 1;\n');

    const readdirSpy = vi.spyOn(fs, 'readdir');

    await dirMentionProvider.suggest({
      workspaceId: 'workspace-1',
      workspacePath,
      query: 'src'
    });
    const firstCallCount = readdirSpy.mock.calls.length;

    await dirMentionProvider.suggest({
      workspaceId: 'workspace-1',
      workspacePath,
      query: 'src'
    });
    const secondCallCount = readdirSpy.mock.calls.length;

    expect(firstCallCount).toBeGreaterThan(0);
    expect(secondCallCount).toBe(firstCallCount);
  });
});
