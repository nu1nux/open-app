/**
 * @fileoverview Workspace mention indexing and resolution for composer @mentions.
 * @module main/composer/mentions
 */

import type { MentionRef, MentionSuggestion } from '../../shared/composer';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Dirent } from 'node:fs';

/**
 * Indexed workspace files cache.
 */
type WorkspaceMentionCache = {
  entries: MentionSuggestion[];
  builtAt: number;
};

/**
 * In-memory index cache by workspace ID.
 */
const cache = new Map<string, WorkspaceMentionCache>();

/**
 * Directories excluded from mention indexing.
 */
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', 'out']);

const MAX_INDEX_FILES = 8000;
const CACHE_TTL_MS = 10000;

/**
 * Converts path separators to POSIX style for stable mention text.
 */
function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

/**
 * Returns true if candidate path resides inside the workspace root.
 */
function isPathInsideWorkspace(workspaceRoot: string, candidatePath: string): boolean {
  const relative = path.relative(workspaceRoot, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/**
 * Walks workspace files and builds mention suggestion entries.
 */
async function buildWorkspaceIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const entries: MentionSuggestion[] = [];
  const stack: string[] = [workspacePath];

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
      if (child.name.startsWith('.')) continue;
      const absolutePath = path.join(current, child.name);

      if (child.isDirectory()) {
        if (ignoredDirectories.has(child.name)) continue;
        stack.push(absolutePath);
        continue;
      }

      if (!child.isFile()) continue;

      const relativePath = toPosixPath(path.relative(workspacePath, absolutePath));
      entries.push({
        kind: 'mention',
        id: `${workspaceId}:${relativePath}`,
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

/**
 * Returns cached index or rebuilds if stale.
 */
async function getWorkspaceIndex(workspaceId: string, workspacePath: string): Promise<MentionSuggestion[]> {
  const hit = cache.get(workspaceId);
  if (hit && Date.now() - hit.builtAt < CACHE_TTL_MS) {
    return hit.entries;
  }
  return buildWorkspaceIndex(workspaceId, workspacePath);
}

/**
 * Returns mention suggestions for a query string.
 */
export async function suggestMentions(
  workspaceId: string,
  workspacePath: string,
  query: string
): Promise<MentionSuggestion[]> {
  const entries = await getWorkspaceIndex(workspaceId, workspacePath);
  const normalized = query.toLowerCase();

  if (!normalized) {
    return entries.slice(0, 20);
  }

  const startsWith = entries.filter((entry) => entry.relativePath.toLowerCase().startsWith(normalized));
  const includes = entries.filter(
    (entry) =>
      !entry.relativePath.toLowerCase().startsWith(normalized) &&
      entry.relativePath.toLowerCase().includes(normalized)
  );
  return [...startsWith, ...includes].slice(0, 20);
}

/**
 * Resolves a raw mention query into a stable mention reference.
 */
export async function resolveMention(
  workspaceId: string,
  workspacePath: string,
  query: string
): Promise<{ mention: MentionRef | null; reason?: 'unresolved' | 'outside-workspace' }> {
  const normalized = query.replace(/^\.?\//, '');
  const directPath = path.resolve(workspacePath, normalized);

  if (!isPathInsideWorkspace(workspacePath, directPath)) {
    return { mention: null, reason: 'outside-workspace' };
  }

  try {
    const stat = await fs.stat(directPath);
    if (stat.isFile()) {
      const relativePath = toPosixPath(path.relative(workspacePath, directPath));
      return {
        mention: {
          id: `${workspaceId}:${relativePath}`,
          type: 'file',
          workspaceId,
          absolutePath: directPath,
          relativePath,
          display: relativePath
        }
      };
    }
  } catch {
    // Fall through to fuzzy search.
  }

  const matches = await suggestMentions(workspaceId, workspacePath, normalized);
  const best = matches.find((entry) => entry.relativePath.toLowerCase() === normalized.toLowerCase()) ?? matches[0];
  if (!best) {
    return { mention: null, reason: 'unresolved' };
  }

  return {
    mention: {
      id: best.id,
      type: 'file',
      workspaceId,
      absolutePath: best.absolutePath,
      relativePath: best.relativePath,
      display: best.display
    }
  };
}
