/**
 * @fileoverview Spotlight module for workspace synchronization.
 * Provides functionality to apply workspace changes to the repository root.
 * @module core/spotlight/spotlight
 */

import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { execa } from "execa";

const NODE_MODULES_SEGMENT = "node_modules";

function isInsideRoot(rootPath: string, targetPath: string): boolean {
  const normalizedRoot = resolve(rootPath);
  const normalizedTarget = resolve(targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${sep}`);
}

function resolveTrackedPath(rootPath: string, relativePath: string): string {
  const absolutePath = resolve(rootPath, relativePath);
  if (!isInsideRoot(rootPath, absolutePath)) {
    throw new Error(`Refusing to sync tracked path outside root: ${relativePath}`);
  }
  return absolutePath;
}

function isNodeModulesPath(path: string): boolean {
  return path.split("/").includes(NODE_MODULES_SEGMENT);
}

/**
 * Applies workspace files to the repository root.
 * Restricts synchronization to git-tracked files and skips node_modules.
 * @param {string} workspacePath - Path to the workspace directory
 * @param {string} repoRoot - Root path of the git repository
 * @returns {Promise<void>}
 */
export async function applyWorkspaceToRoot(workspacePath: string, repoRoot: string) {
  const { stdout } = await execa("git", ["-C", repoRoot, "ls-files", "-z"]);
  const trackedPaths = stdout
    .split("\0")
    .filter(Boolean)
    .filter((relativePath) => !isNodeModulesPath(relativePath));

  for (const relativePath of trackedPaths) {
    const sourcePath = resolveTrackedPath(workspacePath, relativePath);
    const destinationPath = resolveTrackedPath(repoRoot, relativePath);
    const sourceStat = await stat(sourcePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    });

    if (!sourceStat) {
      await rm(destinationPath, { recursive: true, force: true });
      continue;
    }

    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, { recursive: true, force: true });
  }
}
