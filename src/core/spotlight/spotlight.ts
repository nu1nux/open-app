/**
 * @fileoverview Spotlight module for workspace synchronization.
 * Provides functionality to apply workspace changes to the repository root.
 * @module core/spotlight/spotlight
 */

import { execa } from "execa";

/**
 * Applies workspace files to the repository root using rsync.
 * TODO: restrict to tracked files (git ls-files) and skip node_modules
 * @param {string} workspacePath - Path to the workspace directory
 * @param {string} repoRoot - Root path of the git repository
 * @returns {Promise<void>}
 */
export async function applyWorkspaceToRoot(workspacePath: string, repoRoot: string) {
  await execa("rsync", ["-a", "--delete", workspacePath + "/", repoRoot + "/"]);
}
