/**
 * @fileoverview Mention provider coordinator for composer @mentions.
 * @module main/composer/mentions
 */

import path from 'node:path';
import type { MentionRef, MentionSuggestion, MentionType } from '../../shared/composer';
import { dirMentionProvider } from './mentionProviders/dirProvider';
import { fileMentionProvider } from './mentionProviders/fileProvider';
import { imageMentionProvider } from './mentionProviders/imageProvider';
import { mcpMentionProvider } from './mentionProviders/mcpProvider';
import type { MentionProvider, MentionProviderInput } from './mentionProviders/types';

const providersByKind: Record<MentionType, MentionProvider> = {
  file: fileMentionProvider,
  directory: dirMentionProvider,
  image: imageMentionProvider,
  mcp: mcpMentionProvider
};

function detectMentionType(query: string): MentionType {
  if (query.includes(':') && !query.startsWith('./') && !query.startsWith('../')) {
    return 'mcp';
  }
  if (query.endsWith('/')) {
    return 'directory';
  }
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(query)) {
    return 'image';
  }
  return 'file';
}

function shouldIncludeDirectorySuggestions(query: string): boolean {
  if (!query) return true;
  if (query.endsWith('/')) return true;
  if (/\.[A-Za-z0-9]+$/.test(query)) return false;
  return !query.includes('.');
}

function isPathInsideWorkspace(workspaceRoot: string, candidatePath: string): boolean {
  const relative = path.relative(workspaceRoot, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getSuggestedProviders(query: string): MentionProvider[] {
  const mentionType = detectMentionType(query);
  if (mentionType === 'mcp') return [providersByKind.mcp];
  if (mentionType === 'directory') return [providersByKind.directory, providersByKind.file];
  if (mentionType === 'image') return [providersByKind.image, providersByKind.file];
  return shouldIncludeDirectorySuggestions(query)
    ? [providersByKind.file, providersByKind.directory, providersByKind.image]
    : [providersByKind.file, providersByKind.image];
}

function rankSuggestions(entries: MentionSuggestion[], query: string): MentionSuggestion[] {
  const normalized = query.toLowerCase();
  if (!normalized) return entries.slice(0, 20);

  const startsWith = entries.filter((entry) => entry.value.toLowerCase().startsWith(normalized));
  const includes = entries.filter(
    (entry) => !entry.value.toLowerCase().startsWith(normalized) && entry.value.toLowerCase().includes(normalized)
  );
  return [...startsWith, ...includes].slice(0, 20);
}

function dedupeSuggestions(entries: MentionSuggestion[]): MentionSuggestion[] {
  const seen = new Set<string>();
  const deduped: MentionSuggestion[] = [];

  for (const entry of entries) {
    const key = `${entry.id}:${entry.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

/**
 * Returns mention suggestions for a query string.
 */
export async function suggestMentions(
  workspaceId: string,
  workspacePath: string,
  query: string
): Promise<MentionSuggestion[]> {
  const input: MentionProviderInput = { workspaceId, workspacePath, query };
  const providerResults = await Promise.all(getSuggestedProviders(query).map((provider) => provider.suggest(input)));
  const merged = dedupeSuggestions(providerResults.flat());
  return rankSuggestions(merged, query);
}

/**
 * Resolves a raw mention query into a stable mention reference.
 */
export async function resolveMention(
  workspaceId: string,
  workspacePath: string,
  query: string,
  mentionType?: MentionType
): Promise<{ mention: MentionRef | null; reason?: 'unresolved' | 'outside-workspace' }> {
  const normalized = query.replace(/^\.?\//, '').replace(/\/+$/, '');
  const inferredType = mentionType ?? detectMentionType(query);

  if (inferredType !== 'mcp') {
    const directPath = path.resolve(workspacePath, normalized || '.');
    if (!isPathInsideWorkspace(workspacePath, directPath)) {
      return { mention: null, reason: 'outside-workspace' };
    }
  }

  const primary = providersByKind[inferredType];
  const fallbackKinds: MentionType[] =
    inferredType === 'mcp'
      ? []
      : (['file', 'directory', 'image'] as MentionType[]).filter((kind) => kind !== inferredType);
  const orderedProviders = [primary, ...fallbackKinds.map((kind) => providersByKind[kind])];

  for (const provider of orderedProviders) {
    const mention = await provider.resolve({ workspaceId, workspacePath, query, mentionType: inferredType });
    if (mention) {
      return { mention };
    }
  }

  return { mention: null, reason: 'unresolved' };
}
