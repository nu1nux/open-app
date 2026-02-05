/**
 * @fileoverview Workspace type definitions shared across the application.
 * @module shared/workspace
 */

/**
 * Unique identifier for a workspace.
 */
export type WorkspaceId = string;

/**
 * Specification for creating a new workspace.
 */
export interface WorkspaceSpec {
  repoRoot: string;
  baseBranch?: string;
  from?: { type: "branch" | "pr" | "linear"; ref: string };
  visibleDirs?: string[];
}

/**
 * Represents a workspace with its git worktree configuration.
 */
export interface Workspace {
  id: WorkspaceId;
  repoRoot: string;
  path: string;
  branch: string;
  baseBranch: string;
  createdAt: number;
  archivedAt?: number;
}
