import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';
import ignore from 'ignore';
import type { MentionRef, MentionSuggestion } from '../../../shared/composer';
import type { MentionProvider, MentionProviderInput } from './types';

type WorkspaceFileIndexCache = {
  entries: MentionSuggestion[];
  builtAt: number;
};

const cache = new Map<string, WorkspaceFileIndexCache>();
const CACHE_TTL_MS = 10000;
const MAX_INDEX_FILES = 8000;
const hardIgnoredDirectories = new Set(['.git', 'node_modules']);

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function isPathInsideWorkspace(workspaceRoot: string, candidatePath: string): boolean {
  const relative = path.relative(workspaceRoot, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
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

async function buildFileIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const entries: MentionSuggestion[] = [];
  const stack: string[] = [workspacePath];
  const matcher = await createIgnoreMatcher(workspacePath);

  while (stack.length > 0 && entries.length < MAX_INDEX_FILES) {
    const current = stack.pop();
    if (!current) continue;

    let children: Dirent[] = [];
    try {
      children = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const child of children) {
      const absolutePath = path.join(current, child.name);
      const relativePath = toPosixPath(path.relative(workspacePath, absolutePath));
      if (!relativePath) continue;

      if (child.isDirectory()) {
        if (hardIgnoredDirectories.has(child.name)) continue;
        if (matcher.ignores(relativePath) || matcher.ignores(`${relativePath}/`)) continue;
        stack.push(absolutePath);
        continue;
      }

      if (!child.isFile()) continue;
      if (matcher.ignores(relativePath)) continue;

      entries.push({
        kind: 'mention',
        id: `${workspaceId}:file:${relativePath}`,
        display: relativePath,
        value: relativePath,
        absolutePath,
        relativePath
      });

      if (entries.length >= MAX_INDEX_FILES) break;
    }
  }

  cache.set(workspaceId, { entries, builtAt: Date.now() });
  return entries;
}

async function getFileIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const cached = cache.get(workspaceId);
  if (cached && Date.now() - cached.builtAt < CACHE_TTL_MS) {
    return cached.entries;
  }
  return buildFileIndex(workspaceId, workspacePath);
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
  if (input.query.includes(':')) return [];
  const entries = await getFileIndex(input.workspaceId, input.workspacePath);
  return rankSuggestions(entries, input.query);
}

async function resolve(input: MentionProviderInput): Promise<MentionRef | null> {
  if (input.query.includes(':')) return null;

  const normalized = input.query.replace(/^\.?\//, '');
  const directPath = path.resolve(input.workspacePath, normalized);
  if (!isPathInsideWorkspace(input.workspacePath, directPath)) {
    return null;
  }

  try {
    const stat = await fs.stat(directPath);
    if (stat.isFile()) {
      const relativePath = toPosixPath(path.relative(input.workspacePath, directPath));
      return {
        id: `${input.workspaceId}:file:${relativePath}`,
        type: 'file',
        workspaceId: input.workspaceId,
        absolutePath: directPath,
        relativePath,
        display: relativePath
      };
    }
  } catch {
    // Fallback to fuzzy search below.
  }

  const suggestions = await suggest(input);
  const best =
    suggestions.find((entry) => entry.relativePath.toLowerCase() === normalized.toLowerCase()) ?? suggestions[0];
  if (!best) return null;

  return {
    id: best.id,
    type: 'file',
    workspaceId: input.workspaceId,
    absolutePath: best.absolutePath,
    relativePath: best.relativePath,
    display: best.display
  };
}

export const fileMentionProvider: MentionProvider = {
  kind: 'file',
  suggest,
  resolve
};
