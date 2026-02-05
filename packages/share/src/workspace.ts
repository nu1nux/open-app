export type WorkspaceId = string;

export interface WorkspaceSpec {
  repoRoot: string;
  baseBranch?: string;
  from?: { type: "branch" | "pr" | "linear"; ref: string };
  visibleDirs?: string[];
}

export interface Workspace {
  id: WorkspaceId;
  repoRoot: string;
  path: string;
  branch: string;
  baseBranch: string;
  createdAt: number;
  archivedAt?: number;
}
