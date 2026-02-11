import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGitStore } from './gitStore';

type MockOpenApp = {
  git: {
    summary: ReturnType<typeof vi.fn>;
    files: ReturnType<typeof vi.fn>;
    fileLists: ReturnType<typeof vi.fn>;
  };
};

function installWindowMock(mockOpenApp: MockOpenApp) {
  Object.defineProperty(globalThis, 'window', {
    value: { openApp: mockOpenApp },
    configurable: true,
    writable: true
  });
}

describe('useGitStore', () => {
  beforeEach(() => {
    useGitStore.setState({
      summary: null,
      files: [],
      stagedFiles: [],
      unstagedFiles: [],
      gitAvailable: true,
      gitReason: undefined,
      isLoading: false
    });
  });

  it('stores staged and unstaged lists from git.fileLists()', async () => {
    const openApp: MockOpenApp = {
      git: {
        summary: vi.fn(),
        files: vi.fn(),
        fileLists: vi.fn().mockResolvedValue({
          available: true,
          staged: [
            { path: 'src/a.ts', status: 'M ', staged: true, unstaged: false },
            { path: 'src/c.ts', status: 'MM', staged: true, unstaged: true }
          ],
          unstaged: [
            { path: 'src/b.ts', status: ' M', staged: false, unstaged: true },
            { path: 'src/c.ts', status: 'MM', staged: true, unstaged: true }
          ]
        })
      }
    };
    installWindowMock(openApp);

    await useGitStore.getState().fetchFileLists();

    expect(useGitStore.getState().stagedFiles).toHaveLength(2);
    expect(useGitStore.getState().unstagedFiles).toHaveLength(2);
    expect(useGitStore.getState().files).toHaveLength(3);
    expect(useGitStore.getState().files.map((file) => file.path)).toEqual([
      'src/a.ts',
      'src/c.ts',
      'src/b.ts'
    ]);
    expect(useGitStore.getState().gitAvailable).toBe(true);
  });

  it('falls back to git.files() when git.fileLists() is unavailable', async () => {
    const openApp: MockOpenApp = {
      git: {
        summary: vi.fn(),
        files: vi.fn().mockResolvedValue({
          available: true,
          files: [
            { path: 'src/fallback.ts', status: ' M', staged: false, unstaged: true }
          ]
        }),
        fileLists: vi.fn().mockRejectedValue(new Error('missing handler'))
      }
    };
    installWindowMock(openApp);

    await useGitStore.getState().fetchFileLists();

    expect(openApp.git.files).toHaveBeenCalledTimes(1);
    expect(useGitStore.getState().unstagedFiles.map((file) => file.path)).toEqual(['src/fallback.ts']);
    expect(useGitStore.getState().gitAvailable).toBe(true);
  });
});
