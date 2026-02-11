/**
 * @fileoverview Shared composer protocol types for slash commands and mentions.
 * @module shared/composer
 */

/**
 * Supported slash command names.
 */
export const commandNames = [
  'help',
  'clear',
  'model',
  'compact',
  'review',
  'plan',
  'status',
  'diff',
  'test',
  'resume',
  'rewind',
  'rename',
  'export',
  'copy',
  'exit',
  'context',
  'memory',
  'init',
  'add-dir',
  'todos',
  'tasks',
  'debug',
  'config',
  'permissions',
  'cost',
  'theme',
  'vim',
  'usage',
  'stats',
  'doctor',
  'bug',
  'mcp'
] as const;

/**
 * Slash command name union.
 */
export type CommandName = (typeof commandNames)[number];

/**
 * Supported mention reference types.
 */
export const mentionTypes = ['file', 'directory', 'image', 'mcp'] as const;

/**
 * Mention type union.
 */
export type MentionType = (typeof mentionTypes)[number];

/**
 * Command execution routing mode.
 */
export type CommandHandler = 'local' | 'cli-proxy' | 'session' | 'custom';

/**
 * Command grouping category for suggestions and docs.
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
 * Parser diagnostic code values.
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
 * Diagnostic severity levels.
 */
export type ComposerDiagnosticSeverity = 'error' | 'warning';

/**
 * Token category in composer input.
 */
export type ComposerTokenKind = 'text' | 'command' | 'mention';

/**
 * Input token with source span.
 */
export type ComposerToken = {
  kind: ComposerTokenKind;
  raw: string;
  start: number;
  end: number;
};

/**
 * Parsed slash command invocation.
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
 * Parser or execution diagnostic.
 */
export type ComposerDiagnostic = {
  code: ComposerDiagnosticCode;
  severity: ComposerDiagnosticSeverity;
  message: string;
  start: number;
  end: number;
  blocking: boolean;
};

/**
 * Authoritative parse result returned by main process.
 */
export type ComposerParseResult = {
  rawInput: string;
  tokens: ComposerToken[];
  command: CommandInvocation | null;
  mentions: MentionRef[];
  normalizedPrompt: string;
  diagnostics: ComposerDiagnostic[];
  blocking: boolean;
};

/**
 * Command metadata used by the slash-command palette.
 */
export type CommandDefinition = {
  name: string;
  syntax: string;
  description: string;
  category: CommandCategory;
  handler: CommandHandler;
  minArgs: number;
  maxArgs: number;
  allowFlags: boolean;
  source?: 'builtin' | 'skill';
};

/**
 * Command suggestion entry for slash-command autocomplete.
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
 * Mention suggestion entry for @ autocomplete.
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
 * Unified composer suggestion entry.
 */
export type ComposerSuggestion = CommandSuggestion | MentionSuggestion;

/**
 * Suggestion context for current cursor position.
 */
export type ComposerSuggestContext = 'none' | 'command' | 'mention';

/**
 * Suggestion result from main process.
 */
export type ComposerSuggestResult = {
  context: ComposerSuggestContext;
  query: string;
  suggestions: ComposerSuggestion[];
};

/**
 * Input payload for authoritative prepare call.
 */
export type ComposerPrepareInput = {
  rawInput: string;
  cursor: number;
  workspaceId: string;
  threadId: string | null;
  selectedMentionIds?: string[];
  modelOverride?: string;
};

/**
 * Input payload for suggestion call.
 */
export type ComposerSuggestInput = {
  rawInput: string;
  cursor: number;
  workspaceId: string;
  threadId: string | null;
};

/**
 * Provider execution request after authoritative parse.
 */
export type ClaudeExecutionRequest = {
  workspaceId: string;
  workspacePath: string;
  threadId: string | null;
  parseResult: ComposerParseResult;
  modelOverride?: string;
};

/**
 * Optional streaming callbacks for provider execution.
 */
export type ComposerExecutionCallbacks = {
  onStreamChunk?: (chunk: string) => void;
  onStreamEnd?: () => void;
};

/**
 * Execution response envelope for renderer.
 */
export type ComposerExecutionResult = {
  ok: boolean;
  provider: 'local' | 'claude-code';
  output?: string;
  action?: 'none' | 'clear';
  modelOverride?: string;
  diagnostics?: ComposerDiagnostic[];
};
