/**
 * @fileoverview Checkpoint type definitions for workspace versioning.
 * @module shared/checkpoints
 */

/**
 * Represents a checkpoint (saved state) of a workspace.
 */
export interface Checkpoint {
  workspaceId: string;
  turnSeq: number;
  ref: string;
  createdAt: number;
}
