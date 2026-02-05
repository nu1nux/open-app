/**
 * @fileoverview TypeScript type definitions for the renderer process.
 * @module renderer/types
 */

/**
 * Represents a workspace entry stored in the application.
 */
export type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

/**
 * Status information for a single file in the git repository.
 */
export type GitFileStatus = {
  path: string;
  staged: boolean;
  unstaged: boolean;
  status: string;
};

/**
 * Summary information about a git repository.
 */
export type GitSummary = {
  available: boolean;
  reason?: string;
  root?: string;
  branch?: string;
  status?: string;
  lastCommit?: string;
};

/**
 * Represents a conversation thread in a workspace.
 */
export type Thread = {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};
