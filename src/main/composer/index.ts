/**
 * @fileoverview Main-process composer service for suggestions and authoritative parse.
 * @module main/composer
 */

import type {
  ComposerDiagnostic,
  ComposerParseResult,
  ComposerSuggestResult,
  CommandSuggestion,
  MentionRef,
  ComposerPrepareInput,
  ComposerSuggestInput
} from '../../shared/composer';
import { listWorkspaces } from '../workspace';
import { discoverSkillCommands } from '../skills';
import { parseComposerInput } from './parser';
import { listCommands, setCustomCommands } from './registry';
import { resolveMention, suggestMentions } from './mentions';

/**
 * Looks up workspace path by workspace ID.
 */
export async function getWorkspacePathById(workspaceId: string): Promise<string | null> {
  const workspaces = await listWorkspaces();
  return workspaces.find((workspace) => workspace.id === workspaceId)?.path ?? null;
}

/**
 * Builds command suggestion entries filtered by query text.
 */
function getCommandSuggestions(query: string): CommandSuggestion[] {
  const normalized = query.toLowerCase();
  return listCommands()
    .filter((command) => command.name.startsWith(normalized))
    .map((command) => ({
      kind: 'command' as const,
      name: command.name,
      syntax: command.syntax,
      description: command.description,
      category: command.category,
      handler: command.handler
    }));
}

/**
 * Refreshes custom skill commands for the active workspace.
 */
async function refreshCustomCommands(workspacePath: string | null): Promise<void> {
  if (!workspacePath) {
    setCustomCommands([]);
    return;
  }

  try {
    const commands = await discoverSkillCommands(workspacePath);
    setCustomCommands(commands);
  } catch {
    setCustomCommands([]);
  }
}

/**
 * Suggestion context at a cursor location.
 */
type SuggestionContext =
  | { context: 'none'; query: '' }
  | { context: 'command'; query: string }
  | { context: 'mention'; query: string };

/**
 * Detects whether the cursor is currently in command or mention completion context.
 */
function detectSuggestionContext(rawInput: string, cursor: number): SuggestionContext {
  const prefix = rawInput.slice(0, Math.max(0, Math.min(cursor, rawInput.length)));
  const mentionMatch = prefix.match(/(?:^|\s)@([A-Za-z0-9_./:-]*)$/);
  if (mentionMatch) {
    return { context: 'mention', query: mentionMatch[1] };
  }

  const commandMatch = prefix.match(/^\s*\/([A-Za-z0-9_-]*)$/);
  if (commandMatch) {
    return { context: 'command', query: commandMatch[1] };
  }

  return { context: 'none', query: '' };
}

/**
 * Returns composer suggestions for slash commands or @mentions at cursor position.
 */
export async function suggestComposer(input: ComposerSuggestInput): Promise<ComposerSuggestResult> {
  const context = detectSuggestionContext(input.rawInput, input.cursor);
  if (context.context === 'none') {
    return { context: 'none', query: '', suggestions: [] };
  }

  if (context.context === 'command') {
    const workspacePath = await getWorkspacePathById(input.workspaceId);
    await refreshCustomCommands(workspacePath);
    return {
      context: 'command',
      query: context.query,
      suggestions: getCommandSuggestions(context.query)
    };
  }

  const workspacePath = await getWorkspacePathById(input.workspaceId);
  if (!workspacePath) {
    return { context: 'mention', query: context.query, suggestions: [] };
  }

  const suggestions = await suggestMentions(input.workspaceId, workspacePath, context.query);
  return {
    context: 'mention',
    query: context.query,
    suggestions
  };
}

/**
 * Resolves extracted mention queries into stable mention references.
 */
async function resolveMentions(
  workspaceId: string,
  workspacePath: string,
  mentionQueries: Array<{ query: string; mentionType: 'file' | 'directory' | 'image' | 'mcp'; start: number; end: number }>
): Promise<{ mentions: MentionRef[]; diagnostics: ComposerDiagnostic[] }> {
  const diagnostics: ComposerDiagnostic[] = [];
  const mentions: MentionRef[] = [];
  const seen = new Set<string>();

  for (const query of mentionQueries) {
    const result = await resolveMention(workspaceId, workspacePath, query.query, query.mentionType);
    if (result.mention) {
      if (!seen.has(result.mention.id)) {
        seen.add(result.mention.id);
        mentions.push(result.mention);
      }
      continue;
    }

    if (result.reason === 'outside-workspace') {
      diagnostics.push({
        code: 'MENTION_OUTSIDE_WORKSPACE',
        severity: 'error',
        message: `Mention "@${query.query}" is outside the current workspace.`,
        start: query.start,
        end: query.end,
        blocking: true
      });
      continue;
    }

    diagnostics.push({
      code: 'MENTION_UNRESOLVED',
      severity: 'error',
      message: `Unable to resolve mention "@${query.query}".`,
      start: query.start,
      end: query.end,
      blocking: true
    });
  }

  return { mentions, diagnostics };
}

/**
 * Authoritatively parses and validates a composer input submission.
 */
export async function prepareComposer(input: ComposerPrepareInput): Promise<ComposerParseResult> {
  const workspacePath = await getWorkspacePathById(input.workspaceId);
  await refreshCustomCommands(workspacePath);

  const draft = parseComposerInput(input.rawInput);
  const diagnostics: ComposerDiagnostic[] = [...draft.diagnostics];
  let mentions: MentionRef[] = [];

  if (!workspacePath) {
    diagnostics.push({
      code: 'PARSE_SYNTAX',
      severity: 'error',
      message: 'No active workspace was found for this composer action.',
      start: 0,
      end: input.rawInput.length,
      blocking: true
    });
  } else {
    const mentionResult = await resolveMentions(input.workspaceId, workspacePath, draft.mentionQueries);
    mentions = mentionResult.mentions;
    diagnostics.push(...mentionResult.diagnostics);
  }

  return {
    rawInput: input.rawInput,
    tokens: draft.tokens,
    command: draft.command,
    mentions,
    normalizedPrompt: draft.normalizedPrompt,
    diagnostics,
    blocking: diagnostics.some((diagnostic) => diagnostic.blocking)
  };
}
