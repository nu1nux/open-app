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
  | 'test';

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
  name: CommandName;
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
  type: 'file';
  workspaceId: string;
  absolutePath: string;
  relativePath: string;
  display: string;
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
  name: CommandName;
  syntax: string;
  description: string;
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
