/**
 * @fileoverview TypeScript type declarations for the renderer process.
 * Defines the global window.openApp API types exposed by the preload script.
 * @module renderer/vite-env
 */

/// <reference types="vite/client" />

/**
 * Workspace entry stored in the application.
 */
type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

/**
 * Workspace discovered during filesystem scanning.
 */
type DiscoveredWorkspace = {
  name: string;
  path: string;
  lastModifiedAt: string;
};

/**
 * Result of a workspace removal operation.
 */
type WorkspaceRemoveResult = {
  removed: boolean;
  current: WorkspaceEntry | null;
};

/**
 * Summary information about a git repository.
 */
type GitSummary = {
  available: boolean;
  reason?: string;
  root?: string;
  branch?: string;
  status?: string;
  lastCommit?: string;
};

/**
 * Status information for a single file in the git repository.
 */
type GitFileStatus = {
  path: string;
  staged: boolean;
  unstaged: boolean;
  status: string;
};

/**
 * Result of getting git file statuses.
 */
type GitFilesResult = {
  available: boolean;
  reason?: string;
  files: GitFileStatus[];
};

/**
 * Result of a diff operation.
 */
type DiffResult = {
  available: boolean;
  reason?: string;
  unstaged?: string;
  staged?: string;
};

/**
 * Application event types for IPC communication.
 */
type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed';

/**
 * Global type declarations for the window object.
 */
declare global {
  interface Window {
    openApp: {
      ping: () => Promise<string>;
      workspace: {
        list: () => Promise<WorkspaceEntry[]>;
        recent: (limit?: number) => Promise<WorkspaceEntry[]>;
        discover: (options?: {
          roots?: string[];
          maxDepth?: number;
          limit?: number;
          includeIgnored?: boolean;
        }) => Promise<DiscoveredWorkspace[]>;
        current: () => Promise<WorkspaceEntry | null>;
        add: (dirPath: string) => Promise<WorkspaceEntry>;
        pick: () => Promise<WorkspaceEntry | null>;
        set: (id: string) => Promise<WorkspaceEntry | null>;
        rename: (id: string, name: string) => Promise<WorkspaceEntry | null>;
        remove: (id: string) => Promise<WorkspaceRemoveResult>;
        ignored: {
          list: () => Promise<string[]>;
          add: (dirPath: string) => Promise<string[]>;
          remove: (dirPath: string) => Promise<string[]>;
        };
      };
      git: {
        summary: () => Promise<GitSummary>;
        status: () => Promise<GitSummary>;
        files: () => Promise<GitFilesResult>;
      };
      diff: {
        current: () => Promise<DiffResult>;
        file: (filePath: string) => Promise<DiffResult>;
      };
      events: {
        on: (channel: AppEvent, handler: () => void) => () => void;
      };
    };
  }
}

export {};
