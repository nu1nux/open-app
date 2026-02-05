import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getCurrentWorkspacePath } from '../workspace';

const execFileAsync = promisify(execFile);
const MAX_CHARS = 20000;

export type DiffResult = {
  available: boolean;
  reason?: string;
  unstaged?: string;
  staged?: string;
};

function truncate(text: string) {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n...diff truncated (${text.length - MAX_CHARS} more chars)`;
}

async function runGitDiff(args: string[], cwd: string) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd });
    const content = stdout.trim();
    return content.length === 0 ? '(no changes)' : truncate(content);
  } catch (error: any) {
    return `git diff failed: ${error?.stderr?.toString?.() ?? error?.message ?? 'unknown error'}`;
  }
}

export function initDiff() {
  // Placeholder for future diff module bootstrapping.
}

async function ensureRepo(cwd: string) {
  try {
    await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

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
