/**
 * @fileoverview Git diff module for the main process.
 * Provides functions to retrieve staged and unstaged diffs
 * for the current workspace.
 * @module main/diff
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getCurrentWorkspacePath } from '../workspace';

/** Promisified version of execFile for async git commands */
const execFileAsync = promisify(execFile);
/** Maximum characters to include in diff output before truncation */
const MAX_CHARS = 20000;

/**
 * Result of a diff operation.
 */
export type DiffResult = {
  available: boolean;
  reason?: string;
  unstaged?: string;
  staged?: string;
};

/**
 * Truncates text to the maximum allowed characters.
 * @param {string} text - The text to truncate
 * @returns {string} The truncated text with a message if truncated
 */
function truncate(text: string) {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n...diff truncated (${text.length - MAX_CHARS} more chars)`;
}

/**
 * Runs a git diff command with the specified arguments.
 * @param {string[]} args - Arguments to pass to git diff
 * @param {string} cwd - Working directory for the command
 * @returns {Promise<string>} The diff output or error message
 */
async function runGitDiff(args: string[], cwd: string) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd });
    const content = stdout.trim();
    return content.length === 0 ? '(no changes)' : truncate(content);
  } catch (error: any) {
    return `git diff failed: ${error?.stderr?.toString?.() ?? error?.message ?? 'unknown error'}`;
  }
}

/**
 * Initializes the diff module.
 * Placeholder for future diff module bootstrapping.
 */
export function initDiff() {
  // Placeholder for future diff module bootstrapping.
}

/**
 * Checks if the given directory is inside a git repository.
 * @param {string} cwd - Directory path to check
 * @returns {Promise<boolean>} True if inside a git repository
 */
async function ensureRepo(cwd: string) {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the diff for all files in the current workspace.
 * Returns both staged and unstaged changes.
 * @returns {Promise<DiffResult>} The diff result with staged and unstaged changes
 */
export async function getDiff(): Promise<DiffResult> {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: 'No workspace selected' };
  }

  const isRepo = await ensureRepo(cwd);
  if (!isRepo) {
    return { available: false, reason: 'Not a git repository' };
  }

  const unstaged = await runGitDiff(['diff'], cwd);
  const staged = await runGitDiff(['diff', '--staged'], cwd);

  return {
    available: true,
    unstaged,
    staged
  };
}

/**
 * Gets the diff for a specific file in the current workspace.
 * Returns both staged and unstaged changes for the file.
 * @param {string} filePath - Path to the file relative to the repository root
 * @returns {Promise<DiffResult>} The diff result for the specified file
 */
export async function getDiffForFile(filePath: string): Promise<DiffResult> {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: 'No workspace selected' };
  }

  const isRepo = await ensureRepo(cwd);
  if (!isRepo) {
    return { available: false, reason: 'Not a git repository' };
  }

  const unstaged = await runGitDiff(['diff', '--', filePath], cwd);
  const staged = await runGitDiff(['diff', '--staged', '--', filePath], cwd);

  return {
    available: true,
    unstaged,
    staged
  };
}
