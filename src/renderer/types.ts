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

/**
 * Delete transaction entity types.
 */
export type DeleteEntityType = 'thread' | 'workspace';

/**
 * Delete transaction lifecycle status.
 */
export type DeleteActionStatus = 'pending' | 'committed' | 'reverted' | 'failed';

/**
 * Delete transaction error code values.
 */
export type DeleteErrorCode =
  | 'DELETE_NOT_FOUND'
  | 'DELETE_ALREADY_FINALIZED'
  | 'DELETE_UNDO_EXPIRED'
  | 'DELETE_COMMIT_FAILED'
  | 'DELETE_FEATURE_DISABLED';

/**
 * Snapshot payload used to restore optimistic UI state.
 */
export type DeleteSnapshot = {
  entityType: DeleteEntityType;
  payload: Record<string, unknown>;
};

/**
 * Delete transaction action payload.
 */
export type DeleteAction = {
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

/**
 * Delete request payload.
 */
export type DeleteRequest = {
  entityType: DeleteEntityType;
  entityId: string;
  snapshot: DeleteSnapshot;
};

/**
 * Delete undo request payload.
 */
export type DeleteUndoRequest = {
  actionId: string;
};

/**
 * Delete API result payload.
 */
export type DeleteResult =
  | { ok: true; action: DeleteAction }
  | { ok: false; error: { code: DeleteErrorCode; message: string } };

/**
 * Supported slash command names for composer.
 */
export type CommandName =
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

/**
 * Mention reference types.
 */
export type MentionType = 'file' | 'directory' | 'image' | 'mcp';

/**
 * Command execution routing mode.
 */
export type CommandHandler = 'local' | 'cli-proxy' | 'session' | 'custom';

/**
 * Command grouping category for slash palette.
 */
export type CommandCategory =
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
export type ComposerDiagnosticCode =
  | 'CMD_UNKNOWN'
  | 'CMD_INVALID_ARGS'
  | 'CMD_UNSUPPORTED_FLAG'
  | 'MENTION_UNRESOLVED'
  | 'MENTION_OUTSIDE_WORKSPACE'
  | 'PARSE_SYNTAX'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH_REQUIRED';

/**
 * Parsed command invocation.
 */
export type CommandInvocation = {
  name: string;
  args: string[];
  raw: string;
  start: number;
  end: number;
};

/**
 * Resolved mention reference.
 */
export type MentionRef = {
  id: string;
  type: MentionType;
  workspaceId: string;
  absolutePath?: string;
  relativePath?: string;
  display: string;
  payload?: Record<string, unknown>;
};

/**
 * Parser/execution diagnostic.
 */
export type ComposerDiagnostic = {
  code: ComposerDiagnosticCode;
  severity: 'error' | 'warning';
  message: string;
  start: number;
  end: number;
  blocking: boolean;
};

/**
 * Authoritative parse result.
 */
export type ComposerParseResult = {
  rawInput: string;
  command: CommandInvocation | null;
  mentions: MentionRef[];
  normalizedPrompt: string;
  diagnostics: ComposerDiagnostic[];
  blocking: boolean;
};

/**
 * Slash command suggestion.
 */
export type CommandSuggestion = {
  kind: 'command';
  name: string;
  syntax: string;
  description: string;
  category: CommandCategory;
  handler: CommandHandler;
};

/**
 * Mention suggestion.
 */
export type MentionSuggestion = {
  kind: 'mention';
  id: string;
  display: string;
  value: string;
  absolutePath: string;
  relativePath: string;
};

/**
 * Unified composer suggestion.
 */
export type ComposerSuggestion = CommandSuggestion | MentionSuggestion;

/**
 * Suggestion response payload.
 */
export type ComposerSuggestResult = {
  context: 'none' | 'command' | 'mention';
  query: string;
  suggestions: ComposerSuggestion[];
};

/**
 * Composer execution result payload.
 */
export type ComposerExecutionResult = {
  ok: boolean;
  provider: 'local' | 'claude-code';
  output?: string;
  action?: 'none' | 'clear';
  modelOverride?: string;
  diagnostics?: ComposerDiagnostic[];
};

/**
 * Streaming payload emitted during composer execution.
 */
export type ComposerStreamChunk = {
  threadId: string | null;
  chunk: string;
};

/**
 * Streaming payload emitted when composer execution stream ends.
 */
export type ComposerStreamEnd = {
  threadId: string | null;
};
