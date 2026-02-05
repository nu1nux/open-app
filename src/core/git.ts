/**
 * @fileoverview Git adapter for interacting with git repositories.
 * Provides an abstraction layer over simple-git for worktree,
 * status, and diff operations.
 * @module core/git
 */

import simpleGit, { type SimpleGit } from "simple-git";

/**
 * Interface for git operations used by the application.
 */
export interface GitAdapter {
  createWorktree(repoRoot: string, path: string, branch: string, baseBranch: string): Promise<void>;
  removeWorktree(repoRoot: string, path: string): Promise<void>;
  status(repoRoot: string): Promise<{ filesChanged: number; summary: string }>;
  diff(repoRoot: string): Promise<string>;
}

/**
 * Creates a new git adapter instance.
 * @returns {GitAdapter} A git adapter with methods for worktree, status, and diff operations
 */
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
