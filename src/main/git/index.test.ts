import { describe, expect, it } from 'vitest';
import { groupGitFilesByStage } from './index';

describe('groupGitFilesByStage', () => {
  it('separates staged and unstaged files from porcelain entries', () => {
    const files = [
      { path: 'a.ts', status: 'M ', staged: true, unstaged: false },
      { path: 'b.ts', status: ' M', staged: false, unstaged: true },
      { path: 'c.ts', status: 'MM', staged: true, unstaged: true }
    ];

    const grouped = groupGitFilesByStage(files);

    expect(grouped.staged.map((file) => file.path)).toEqual(['a.ts', 'c.ts']);
    expect(grouped.unstaged.map((file) => file.path)).toEqual(['b.ts', 'c.ts']);
  });
});
