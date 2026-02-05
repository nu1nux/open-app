/**
 * @fileoverview Git integration module for the main process.
 * Provides functions to interact with git repositories including
 * getting status, summaries, and file change information.
 * @module main/git
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getCurrentWorkspacePath } from '../workspace';

/** Promisified version of execFile for async git commands */
const execFileAsync = promisify(execFile);

/**
 * Summary information about a git repository.
 */
export type GitSummary = {
  available: boolean;
  reason?: string;
  root?: string;
  branch?: string;
  status?: string;
  lastCommit?: string;
};

/**
 * Status information for a single file in the git repository.
 */
export type GitFileStatus = {
  path: string;
  staged: boolean;
  unstaged: boolean;
  status: string;
};

/**
 * Executes a git command in the specified directory.
 * @param {string[]} args - Arguments to pass to the git command
 * @param {string} cwd - Working directory for the git command
 * @returns {Promise<{ok: boolean, stdout: string, error?: string}>} Result of the git command
 */
async function runGit(args: string[], cwd: string) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return { ok: true, stdout: stdout.trim() };
  } catch (error: any) {
    return {
      ok: false,
      stdout: '',
      error: error?.stderr?.toString?.() ?? error?.message ?? 'git command failed'
    };
  }
}

/**
 * Initializes the git module.
 * Placeholder for future git module bootstrapping.
 */
export function initGit() {
  // Placeholder for future git module bootstrapping.
}

/**
 * Gets a summary of the current git repository state.
 * Includes branch name, status, root path, and last commit information.
 * @returns {Promise<GitSummary>} Git repository summary
 */
export async function getGitSummary(): Promise<GitSummary> {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: 'No workspace selected' };
  }

  const repoCheck = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
  if (!repoCheck.ok || repoCheck.stdout !== 'true') {
    return { available: false, reason: 'Not a git repository' };
  }

  const root = await runGit(['rev-parse', '--show-toplevel'], cwd);
  const branch = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const status = await runGit(['status', '-sb'], cwd);
  const lastCommit = await runGit(
    ['log', '-1', '--pretty=format:%h %s (%an, %ad)', '--date=short'],
    cwd
  );

  return {
    available: true,
    root: root.ok ? root.stdout : undefined,
    branch: branch.ok ? branch.stdout : undefined,
    status: status.ok ? status.stdout : undefined,
    lastCommit: lastCommit.ok ? lastCommit.stdout : undefined
  };
}

/**
 * Gets the git status for the current workspace.
 * @returns {Promise<GitSummary>} Git status information
 */
export async function getGitStatus() {
  const summary = await getGitSummary();
  if (!summary.available) {
    return summary;
  }

  return { ...summary, status: summary.status ?? '' };
}

/**
 * Gets the status of all changed files in the current workspace.
 * Parses git porcelain output to determine staged/unstaged state.
 * @returns {Promise<{available: boolean, reason?: string, files: GitFileStatus[]}>} File status information
 */
export async function getGitFileStatuses() {
  const cwd = await getCurrentWorkspacePath();
  if (!cwd) {
    return { available: false, reason: 'No workspace selected', files: [] as GitFileStatus[] };
  }

  const repoCheck = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
  if (!repoCheck.ok || repoCheck.stdout !== 'true') {
    return { available: false, reason: 'Not a git repository', files: [] as GitFileStatus[] };
  }

  const status = await runGit(['status', '--porcelain=v1'], cwd);
  if (!status.ok) {
    return { available: false, reason: status.error ?? 'git status failed', files: [] as GitFileStatus[] };
  }

  const files = status.stdout
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const statusCode = line.slice(0, 2);
      const rawPath = line.slice(3).trim();
      const pathPart = rawPath.includes(' -> ')
        ? rawPath.split(' -> ').slice(-1)[0]
        : rawPath;

      return {
        path: pathPart,
        status: statusCode,
        staged: statusCode[0] !== ' ',
        unstaged: statusCode[1] !== ' '
      };
    });

  return { available: true, files };
}
