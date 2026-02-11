import type { MentionRef, MentionSuggestion } from '../../../shared/composer';
import type { MentionProvider, MentionProviderInput } from './types';

function parseMcpQuery(query: string): { server: string; resource: string } | null {
  const separator = query.indexOf(':');
  if (separator <= 0 || separator === query.length - 1) return null;
  const server = query.slice(0, separator).trim();
  const resource = query.slice(separator + 1).trim();
  if (!server || !resource) return null;
  return { server, resource };
}

async function suggest(input: MentionProviderInput): Promise<MentionSuggestion[]> {
  const parsed = parseMcpQuery(input.query);
  if (!parsed) return [];

  const value = `${parsed.server}:${parsed.resource}`;
  const suggestion: MentionSuggestion = {
    kind: 'mention',
    id: `${input.workspaceId}:mcp:${value}`,
    display: value,
    value,
    absolutePath: '',
    relativePath: value
  };
  return [suggestion];
}

async function resolve(input: MentionProviderInput): Promise<MentionRef | null> {
  const parsed = parseMcpQuery(input.query);
  if (!parsed) return null;

  const value = `${parsed.server}:${parsed.resource}`;
  return {
    id: `${input.workspaceId}:mcp:${value}`,
    type: 'mcp',
    workspaceId: input.workspaceId,
    display: value,
    payload: {
      server: parsed.server,
      resource: parsed.resource
    }
  };
}

export const mcpMentionProvider: MentionProvider = {
  kind: 'mcp',
  suggest,
  resolve
};
