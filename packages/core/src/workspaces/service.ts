import { nanoid } from "nanoid";
import type { Workspace, WorkspaceSpec } from "@open-app/share";
import type { GitAdapter } from "../git";
import { WorkspaceRepo } from "../storage/workspace-repo";

export class WorkspaceService {
  constructor(private repo: WorkspaceRepo, private git: GitAdapter) {}

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

  list(repoRoot: string): Workspace[] {
    return this.repo.list(repoRoot);
  }

  archive(id: string): void {
    this.repo.archive(id, Date.now());
  }
}
