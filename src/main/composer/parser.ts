/**
 * @fileoverview Parser for slash commands and @mention tokens in composer input.
 * @module main/composer/parser
 */

import type { CommandInvocation, ComposerDiagnostic, ComposerToken } from '../../shared/composer';
import { getCommand } from './registry';

/**
 * Unresolved mention query extracted from raw input.
 */
export type MentionQuery = {
  raw: string;
  query: string;
  start: number;
  end: number;
};

/**
 * Intermediate parse result before mention resolution.
 */
export type ComposerParseDraft = {
  tokens: ComposerToken[];
  command: CommandInvocation | null;
  mentionQueries: MentionQuery[];
  diagnostics: ComposerDiagnostic[];
  normalizedPrompt: string;
};

/**
 * Parses quoted command arguments from input text.
 */
function parseArgs(raw: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | '\'' | null = null;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
        continue;
      }
      current += ch;
      continue;
    }

    if (ch === '"' || ch === '\'') {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    args.push(current);
  }

  return args;
}

/**
 * Adds a parser diagnostic.
 */
function pushDiagnostic(
  diagnostics: ComposerDiagnostic[],
  code: ComposerDiagnostic['code'],
  message: string,
  start: number,
  end: number
) {
  diagnostics.push({
    code,
    message,
    severity: 'error',
    blocking: true,
    start,
    end
  });
}

/**
 * Returns true if current position is a safe mention boundary.
 */
function isMentionBoundary(rawInput: string, atIndex: number): boolean {
  const prev = rawInput[atIndex - 1];
  if (!prev) return true;
  return /\s|[([{,]/.test(prev);
}

/**
 * Extracts unresolved @mentions from raw composer text.
 */
function parseMentionQueries(rawInput: string): MentionQuery[] {
  const mentionQueries: MentionQuery[] = [];
  const mentionPattern = /@([A-Za-z0-9_./-]+)/g;

  for (const match of rawInput.matchAll(mentionPattern)) {
    const start = match.index ?? -1;
    if (start < 0 || !isMentionBoundary(rawInput, start)) continue;
    const raw = match[0];
    const query = match[1];
    mentionQueries.push({ raw, query, start, end: start + raw.length });
  }

  return mentionQueries;
}

/**
 * Creates lexical tokens from parsed command and mentions.
 */
function buildTokens(rawInput: string, command: CommandInvocation | null, mentions: MentionQuery[]): ComposerToken[] {
  const chunks: ComposerToken[] = [];
  const special: ComposerToken[] = [];

  if (command) {
    special.push({
      kind: 'command',
      raw: command.raw,
      start: command.start,
      end: command.end
    });
  }

  for (const mention of mentions) {
    special.push({
      kind: 'mention',
      raw: mention.raw,
      start: mention.start,
      end: mention.end
    });
  }

  special.sort((a, b) => a.start - b.start);

  let cursor = 0;
  for (const token of special) {
    if (token.start > cursor) {
      chunks.push({
        kind: 'text',
        raw: rawInput.slice(cursor, token.start),
        start: cursor,
        end: token.start
      });
    }
    chunks.push(token);
    cursor = token.end;
  }

  if (cursor < rawInput.length) {
    chunks.push({
      kind: 'text',
      raw: rawInput.slice(cursor),
      start: cursor,
      end: rawInput.length
    });
  }

  return chunks;
}

/**
 * Parses raw composer input into command and mention draft structures.
 */
export function parseComposerInput(rawInput: string): ComposerParseDraft {
  const diagnostics: ComposerDiagnostic[] = [];
  const mentionQueries = parseMentionQueries(rawInput);
  let command: CommandInvocation | null = null;
  const normalizedPrompt = rawInput.trim();

  const firstNonWhitespace = rawInput.search(/\S/);
  if (firstNonWhitespace >= 0 && rawInput[firstNonWhitespace] === '/') {
    const tail = rawInput.slice(firstNonWhitespace);
    const spaceIndex = tail.search(/\s/);
    const commandToken = spaceIndex < 0 ? tail : tail.slice(0, spaceIndex);
    const commandName = commandToken.slice(1).toLowerCase();
    const argsRaw = spaceIndex < 0 ? '' : tail.slice(spaceIndex + 1).trim();
    const args = parseArgs(argsRaw);
    const def = getCommand(commandName);

    if (!def) {
      pushDiagnostic(
        diagnostics,
        'CMD_UNKNOWN',
        `Unknown command "/${commandName}".`,
        firstNonWhitespace,
        firstNonWhitespace + commandToken.length
      );
    } else {
      command = {
        name: def.name,
        args,
        raw: commandToken,
        start: firstNonWhitespace,
        end: firstNonWhitespace + commandToken.length
      };

      if (!def.allowFlags && args.some((arg) => arg.startsWith('-'))) {
        pushDiagnostic(
          diagnostics,
          'CMD_UNSUPPORTED_FLAG',
          `Command "/${def.name}" does not support flags.`,
          firstNonWhitespace,
          rawInput.length
        );
      } else if (args.length < def.minArgs || args.length > def.maxArgs) {
        pushDiagnostic(
          diagnostics,
          'CMD_INVALID_ARGS',
          `Invalid arguments for "/${def.name}". Expected syntax: ${def.syntax}.`,
          firstNonWhitespace,
          rawInput.length
        );
      }
    }
  }

  return {
    tokens: buildTokens(rawInput, command, mentionQueries),
    command,
    mentionQueries,
    diagnostics,
    normalizedPrompt
  };
}
