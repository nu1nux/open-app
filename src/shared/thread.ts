/**
 * @fileoverview Thread type definitions shared across the application.
 * @module shared/thread
 */

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

/**
 * Thread store state structure.
 */
export type ThreadState = {
  threads: Thread[];
};
