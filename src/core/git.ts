import simpleGit, { type SimpleGit } from "simple-git";

export interface GitAdapter {
  createWorktree(repoRoot: string, path: string, branch: string, baseBranch: string): Promise<void>;
  removeWorktree(repoRoot: string, path: string): Promise<void>;
  status(repoRoot: string): Promise<{ filesChanged: number; summary: string }>;
  diff(repoRoot: string): Promise<string>;
}

export function createGitAdapter(): GitAdapter {
  const git = (dir: string): SimpleGit => simpleGit({ baseDir: dir });

  return {
    async createWorktree(repoRoot, path, branch, baseBranch) {
      await git(repoRoot).raw(["worktree", "add", "-b", branch, path, baseBranch]);
    },
    async removeWorktree(repoRoot, path) {
      await git(repoRoot).raw(["worktree", "remove", "--force", path]);
    },
    async status(repoRoot) {
      const s = await git(repoRoot).status();
      const summary = `${s.files.length} files changed`;
      return { filesChanged: s.files.length, summary };
    },
    async diff(repoRoot) {
      return git(repoRoot).diff();
    }
  };
}
