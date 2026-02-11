import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import type { MentionRef, MentionSuggestion } from '../../../shared/composer';
import type { MentionProvider, MentionProviderInput } from './types';

type WorkspaceDirectoryIndexCache = {
  entries: MentionSuggestion[];
  builtAt: number;
};

const MAX_INDEX_DIRECTORIES = 4000;
const CACHE_TTL_MS = 10000;
const hardIgnoredDirectories = new Set(['.git', 'node_modules']);
const cache = new Map<string, WorkspaceDirectoryIndexCache>();

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

async function buildDirectoryIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const entries: MentionSuggestion[] = [];
  const stack: string[] = [workspacePath];

  while (stack.length > 0 && entries.length < MAX_INDEX_DIRECTORIES) {
    const current = stack.pop();
    if (!current) continue;

    let children: Dirent[] = [];
    try {
      children = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const child of children) {
      if (!child.isDirectory()) continue;
      if (hardIgnoredDirectories.has(child.name)) continue;

      const absolutePath = path.join(current, child.name);
      const relativeBase = toPosixPath(path.relative(workspacePath, absolutePath));
      if (!relativeBase) continue;
      const relativePath = `${relativeBase}/`;

      entries.push({
        kind: 'mention',
        id: `${workspaceId}:directory:${relativePath}`,
        display: relativePath,
        value: relativePath,
        absolutePath,
        relativePath
      });
      stack.push(absolutePath);

      if (entries.length >= MAX_INDEX_DIRECTORIES) break;
    }
  }

  cache.set(workspaceId, { entries, builtAt: Date.now() });
  return entries;
}

async function getDirectoryIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const cached = cache.get(workspaceId);
  if (cached && Date.now() - cached.builtAt < CACHE_TTL_MS) {
    return cached.entries;
  }
  return buildDirectoryIndex(workspaceId, workspacePath);
}

function rankSuggestions(entries: MentionSuggestion[], query: string): MentionSuggestion[] {
  if (!query) return entries.slice(0, 20);
  const normalized = query.toLowerCase();
  const startsWith = entries.filter((entry) => entry.relativePath.toLowerCase().startsWith(normalized));
  const includes = entries.filter(
    (entry) =>
      !entry.relativePath.toLowerCase().startsWith(normalized) &&
      entry.relativePath.toLowerCase().includes(normalized)
  );
  return [...startsWith, ...includes].slice(0, 20);
}

async function suggest(input: MentionProviderInput): Promise<MentionSuggestion[]> {
  const entries = await getDirectoryIndex(input.workspaceId, input.workspacePath);
  return rankSuggestions(entries, input.query);
}

async function resolve(input: MentionProviderInput): Promise<MentionRef | null> {
  const normalized = input.query.replace(/^\.?\//, '').replace(/\/+$/, '');
  const directPath = path.resolve(input.workspacePath, normalized);

  try {
    const stat = await fs.stat(directPath);
    if (stat.isDirectory()) {
      const relativeBase = toPosixPath(path.relative(input.workspacePath, directPath));
      const relativePath = relativeBase ? `${relativeBase}/` : './';
      return {
        id: `${input.workspaceId}:directory:${relativePath}`,
        type: 'directory',
        workspaceId: input.workspaceId,
        absolutePath: directPath,
        relativePath,
        display: relativePath
      };
    }
  } catch {
    // Fallback to fuzzy search.
  }

  const candidates = await suggest(input);
  const best =
    candidates.find((entry) => entry.relativePath.toLowerCase() === `${normalized.toLowerCase()}/`) ?? candidates[0];
  if (!best) return null;

  return {
    id: best.id,
    type: 'directory',
    workspaceId: input.workspaceId,
    absolutePath: best.absolutePath,
    relativePath: best.relativePath,
    display: best.display
  };
}

export const dirMentionProvider: MentionProvider = {
  kind: 'directory',
  suggest,
  resolve
};
