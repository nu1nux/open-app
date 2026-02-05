/// <reference types="vite/client" />

type WorkspaceEntry = {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: string;
};

type DiscoveredWorkspace = {
  name: string;
  path: string;
  lastModifiedAt: string;
};

type WorkspaceRemoveResult = {
  removed: boolean;
  current: WorkspaceEntry | null;
};

type GitSummary = {
  available: boolean;
  reason?: string;
  root?: string;
  branch?: string;
  status?: string;
  lastCommit?: string;
};

type GitFileStatus = {
  path: string;
  staged: boolean;
  unstaged: boolean;
  status: string;
};

type GitFilesResult = {
  available: boolean;
  reason?: string;
  files: GitFileStatus[];
};

type DiffResult = {
  available: boolean;
  reason?: string;
  unstaged?: string;
  staged?: string;
};

type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed';

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
