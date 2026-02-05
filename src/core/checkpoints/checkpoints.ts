/**
 * @fileoverview Checkpoint management for workspace versioning.
 * Creates git references to save workspace state at specific points.
 * @module core/checkpoints/checkpoints
 */

import { execa } from "execa";

/**
 * Creates a checkpoint by storing the current HEAD as a git reference.
 * @param {string} repoRoot - Root path of the git repository
 * @param {string} workspaceId - ID of the workspace
 * @param {number} turnSeq - Turn sequence number for the checkpoint
 * @returns {Promise<string>} The git reference path for the checkpoint
 */
export async function createCheckpoint(repoRoot: string, workspaceId: string, turnSeq: number) {
  const ref = `refs/open-app/checkpoints/${workspaceId}/${turnSeq}`;
  const { stdout } = await execa("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
  await execa("git", ["update-ref", ref, stdout.trim()], { cwd: repoRoot });
  return ref;
}
