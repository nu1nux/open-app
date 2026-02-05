/**
 * @fileoverview Diff service for retrieving git diff information.
 * Provides status and diff operations using the git adapter.
 * @module core/diff/service
 */

import type { GitAdapter } from "../git";

/**
 * Service class for diff and status operations.
 */
export class DiffService {
  /**
   * Creates a new DiffService instance.
   * @param {GitAdapter} git - Git adapter for diff operations
   */
  constructor(private git: GitAdapter) {}

  /**
   * Gets the status of the repository.
   * @param {string} repoRoot - Root path of the git repository
   * @returns {Promise<{filesChanged: number, summary: string}>} Status information
   */
  status(repoRoot: string) {
    return this.git.status(repoRoot);
  }

  /**
   * Gets the diff output for the repository.
   * @param {string} repoRoot - Root path of the git repository
   * @returns {Promise<string>} The diff output
   */
  diff(repoRoot: string) {
    return this.git.diff(repoRoot);
  }
}
