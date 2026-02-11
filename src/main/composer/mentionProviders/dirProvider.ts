import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import ignore from 'ignore';
import type { MentionRef, MentionSuggestion } from '../../../shared/composer';
import type { MentionProvider, MentionProviderInput } from './types';

type WorkspaceDirectoryIndexCache = {
  workspacePath: string;
  entries: MentionSuggestion[];
  builtAt: number;
};

const MAX_INDEX_DIRECTORIES = 4000;
const CACHE_TTL_MS = 60000;
const hardIgnoredDirectories = new Set(['.git', 'node_modules']);
const cache = new Map<string, WorkspaceDirectoryIndexCache>();
const inFlightIndexBuilds = new Map<string, Promise<MentionSuggestion[]>>();

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

async function createIgnoreMatcher(workspacePath: string) {
  const matcher = ignore();
  try {
    const gitignoreText = await fs.readFile(path.join(workspacePath, '.gitignore'), 'utf8');
    matcher.add(gitignoreText);
  } catch {
    // No .gitignore available.
  }
  return matcher;
}

async function buildDirectoryIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const entries: MentionSuggestion[] = [];
  const stack: string[] = [workspacePath];
  const matcher = await createIgnoreMatcher(workspacePath);

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
      if (matcher.ignores(relativeBase) || matcher.ignores(relativePath)) continue;

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

  cache.set(workspaceId, { workspacePath, entries, builtAt: Date.now() });
  return entries;
}

async function getDirectoryIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const cached = cache.get(workspaceId);
  if (cached && cached.workspacePath === workspacePath && Date.now() - cached.builtAt < CACHE_TTL_MS) {
    return cached.entries;
  }

  const cacheKey = `${workspaceId}:${workspacePath}`;
  const existingBuild = inFlightIndexBuilds.get(cacheKey);
  if (existingBuild) {
    return existingBuild;
  }

  const buildPromise = buildDirectoryIndex(workspaceId, workspacePath).finally(() => {
    inFlightIndexBuilds.delete(cacheKey);
  });
  inFlightIndexBuilds.set(cacheKey, buildPromise);
  return buildPromise;
}

function rankSuggestions(entries: MentionSuggestion[], query: string): MentionSuggestion[] {
  if (!query) return entries.slice(0, 20);
  const normalized = query.toLowerCase();
  const startsWith: MentionSuggestion[] = [];
  const includes: MentionSuggestion[] = [];

  for (const entry of entries) {
    const relativeLower = entry.relativePath.toLowerCase();
    if (relativeLower.startsWith(normalized)) {
      startsWith.push(entry);
      continue;
    }
    if (relativeLower.includes(normalized)) {
      includes.push(entry);
    }
  }

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
