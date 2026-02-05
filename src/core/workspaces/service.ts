/**
 * @fileoverview Workspace service for managing git worktrees.
 * Handles creation, listing, and archiving of workspaces.
 * @module core/workspaces/service
 */

import { nanoid } from "nanoid";
import type { Workspace, WorkspaceSpec } from '../../shared';
import type { GitAdapter } from "../git";
import { WorkspaceRepo } from "../storage/workspace-repo";

/**
 * Service class for managing workspaces with git worktrees.
 */
export class WorkspaceService {
  /**
   * Creates a new WorkspaceService instance.
   * @param {WorkspaceRepo} repo - Repository for workspace persistence
   * @param {GitAdapter} git - Git adapter for worktree operations
   */
  constructor(private repo: WorkspaceRepo, private git: GitAdapter) {}

  /**
   * Creates a new workspace with a git worktree.
   * @param {WorkspaceSpec} spec - Workspace specification
   * @returns {Promise<Workspace>} The created workspace
   */
  async create(spec: WorkspaceSpec): Promise<Workspace> {
    const id = nanoid();
    const baseBranch = spec.baseBranch ?? "main";
    const branch = `open/${id}`;
    const path = `${spec.repoRoot}/.open/workspaces/${id}`;

    await this.git.createWorktree(spec.repoRoot, path, branch, baseBranch);

    const ws: Workspace = {
      id,
      repoRoot: spec.repoRoot,
      path,
      branch,
      baseBranch,
      createdAt: Date.now()
    };

    this.repo.insert(ws);
    return ws;
  }

  /**
   * Lists all workspaces for a repository.
   * @param {string} repoRoot - Root path of the git repository
   * @returns {Workspace[]} Array of workspaces
   */
  list(repoRoot: string): Workspace[] {
    return this.repo.list(repoRoot);
  }

  /**
   * Archives a workspace by marking it with an archived timestamp.
   * @param {string} id - The workspace ID to archive
   */
  archive(id: string): void {
    this.repo.archive(id, Date.now());
  }
}
