import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileMentionProvider } from '../fileProvider';

async function writeFile(root: string, relativePath: string, content: string) {
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, 'utf8');
}

describe('fileMentionProvider', () => {
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

  it('deduplicates concurrent index builds for the same workspace', async () => {
    const workspacePath = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-file-provider-'));
    workspaces.push(workspacePath);

    await writeFile(workspacePath, 'src/index.ts', 'export const value = 1;\n');
    await writeFile(workspacePath, 'README.md', '# test\n');

    const readdirSpy = vi.spyOn(fs, 'readdir');

    await fileMentionProvider.suggest({
      workspaceId: 'workspace-baseline',
      workspacePath,
      query: 'src'
    });
    const baselineCallCount = readdirSpy.mock.calls.length;

    readdirSpy.mockClear();
    await Promise.all([
      fileMentionProvider.suggest({
        workspaceId: 'workspace-concurrent',
        workspacePath,
        query: 'src'
      }),
      fileMentionProvider.suggest({
        workspaceId: 'workspace-concurrent',
        workspacePath,
        query: 'src'
      })
    ]);
    const concurrentCallCount = readdirSpy.mock.calls.length;

    expect(baselineCallCount).toBeGreaterThan(0);
    expect(concurrentCallCount).toBe(baselineCallCount);
  });

  it('does not reuse cached index across different workspace paths', async () => {
    const workspacePathA = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-file-provider-a-'));
    const workspacePathB = await fs.mkdtemp(path.join(os.tmpdir(), 'open-app-file-provider-b-'));
    workspaces.push(workspacePathA, workspacePathB);

    await writeFile(workspacePathA, 'alpha.txt', 'alpha\n');
    await writeFile(workspacePathB, 'beta.txt', 'beta\n');

    const fromA = await fileMentionProvider.suggest({
      workspaceId: 'workspace-shared',
      workspacePath: workspacePathA,
      query: 'alpha'
    });
    const fromB = await fileMentionProvider.suggest({
      workspaceId: 'workspace-shared',
      workspacePath: workspacePathB,
      query: 'beta'
    });

    expect(fromA.some((entry) => entry.relativePath === 'alpha.txt')).toBe(true);
    expect(fromB.some((entry) => entry.relativePath === 'beta.txt')).toBe(true);
    expect(fromB.some((entry) => entry.relativePath === 'alpha.txt')).toBe(false);
  });
});
