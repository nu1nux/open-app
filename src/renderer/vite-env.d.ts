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
 * Represents a conversation thread in a workspace.
 */
type Thread = {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

type DeleteEntityType = 'thread' | 'workspace';

type DeleteActionStatus = 'pending' | 'committed' | 'reverted' | 'failed';

type DeleteErrorCode =
  | 'DELETE_NOT_FOUND'
  | 'DELETE_ALREADY_FINALIZED'
  | 'DELETE_UNDO_EXPIRED'
  | 'DELETE_COMMIT_FAILED'
  | 'DELETE_FEATURE_DISABLED';

type DeleteSnapshot = {
  entityType: DeleteEntityType;
  payload: Record<string, unknown>;
};

type DeleteAction = {
  id: string;
  entityType: DeleteEntityType;
  entityId: string;
  status: DeleteActionStatus;
  createdAt: number;
  deadlineAt: number;
  updatedAt: number;
  snapshot: DeleteSnapshot;
  errorCode?: DeleteErrorCode;
  errorMessage?: string;
};

type DeleteRequest = {
  entityType: DeleteEntityType;
  entityId: string;
  snapshot: DeleteSnapshot;
};

type DeleteUndoRequest = {
  actionId: string;
};

type DeleteResult =
  | { ok: true; action: DeleteAction }
  | { ok: false; error: { code: DeleteErrorCode; message: string } };

/**
 * Supported slash command names.
 */
type CommandName =
  | 'help'
  | 'clear'
  | 'model'
  | 'compact'
  | 'review'
  | 'plan'
  | 'status'
  | 'diff'
  | 'test'
  | 'resume'
  | 'rewind'
  | 'rename'
  | 'export'
  | 'copy'
  | 'exit'
  | 'context'
  | 'memory'
  | 'init'
  | 'add-dir'
  | 'todos'
  | 'tasks'
  | 'debug'
  | 'config'
  | 'permissions'
  | 'cost'
  | 'theme'
  | 'vim'
  | 'usage'
  | 'stats'
  | 'doctor'
  | 'bug'
  | 'mcp';

type MentionType = 'file' | 'directory' | 'image' | 'mcp';

type CommandHandler = 'local' | 'cli-proxy' | 'session' | 'custom';

type CommandCategory =
  | 'session'
  | 'context'
  | 'workflow'
  | 'config'
  | 'diagnostics'
  | 'integration'
  | 'custom';

/**
 * Composer diagnostic code values.
 */
type ComposerDiagnosticCode =
  | 'CMD_UNKNOWN'
  | 'CMD_INVALID_ARGS'
  | 'CMD_UNSUPPORTED_FLAG'
  | 'MENTION_UNRESOLVED'
  | 'MENTION_OUTSIDE_WORKSPACE'
  | 'PARSE_SYNTAX'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH_REQUIRED';

/**
 * Command invocation structure.
 */
type CommandInvocation = {
  name: string;
  args: string[];
  raw: string;
  start: number;
  end: number;
};

/**
 * Mention reference structure.
 */
type MentionRef = {
  id: string;
  type: MentionType;
  workspaceId: string;
  absolutePath?: string;
  relativePath?: string;
  display: string;
  payload?: Record<string, unknown>;
};

/**
 * Composer diagnostics payload.
 */
type ComposerDiagnostic = {
  code: ComposerDiagnosticCode;
  severity: 'error' | 'warning';
  message: string;
  start: number;
  end: number;
  blocking: boolean;
};

/**
 * Authoritative parse payload.
 */
type ComposerParseResult = {
  rawInput: string;
  command: CommandInvocation | null;
  mentions: MentionRef[];
  normalizedPrompt: string;
  diagnostics: ComposerDiagnostic[];
  blocking: boolean;
};

/**
 * Slash command suggestion entry.
 */
type CommandSuggestion = {
  kind: 'command';
  name: string;
  syntax: string;
  description: string;
  category: CommandCategory;
  handler: CommandHandler;
};

/**
 * Mention suggestion entry.
 */
type MentionSuggestion = {
  kind: 'mention';
  id: string;
  display: string;
  value: string;
  absolutePath: string;
  relativePath: string;
};

/**
 * Unified suggestion entry.
 */
type ComposerSuggestion = CommandSuggestion | MentionSuggestion;

/**
 * Suggestion response payload.
 */
type ComposerSuggestResult = {
  context: 'none' | 'command' | 'mention';
  query: string;
  suggestions: ComposerSuggestion[];
};

/**
 * Execution response payload.
 */
type ComposerExecutionResult = {
  ok: boolean;
  provider: 'local' | 'claude-code';
  output?: string;
  action?: 'none' | 'clear';
  modelOverride?: string;
  diagnostics?: ComposerDiagnostic[];
};

type ComposerStreamChunk = {
  threadId: string | null;
  chunk: string;
};

type ComposerStreamEnd = {
  threadId: string | null;
};

/**
 * Application event types for IPC communication.
 */
type AppEvent = 'workspace:changed' | 'git:changed' | 'diff:changed' | 'delete:changed';

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
      thread: {
        list: (workspaceId: string) => Promise<Thread[]>;
        create: (workspaceId: string, title: string) => Promise<Thread>;
        rename: (id: string, title: string) => Promise<Thread | null>;
        remove: (id: string) => Promise<boolean>;
      };
      delete: {
        request: (input: DeleteRequest) => Promise<DeleteResult>;
        undo: (input: DeleteUndoRequest) => Promise<DeleteResult>;
        listPending: () => Promise<DeleteAction[]>;
      };
      composer: {
        suggest: (input: {
          rawInput: string;
          cursor: number;
          workspaceId: string;
          threadId: string | null;
        }) => Promise<ComposerSuggestResult>;
        prepare: (input: {
          rawInput: string;
          cursor: number;
          workspaceId: string;
          threadId: string | null;
          selectedMentionIds?: string[];
          modelOverride?: string;
        }) => Promise<ComposerParseResult>;
        execute: (input: {
          rawInput: string;
          cursor: number;
          workspaceId: string;
          threadId: string | null;
          selectedMentionIds?: string[];
          modelOverride?: string;
        }) => Promise<ComposerExecutionResult>;
        onStreamChunk: (handler: (payload: ComposerStreamChunk) => void) => () => void;
        onStreamEnd: (handler: (payload: ComposerStreamEnd) => void) => () => void;
      };
      events: {
        on: (channel: AppEvent, handler: () => void) => () => void;
      };
    };
  }
}

export {};
