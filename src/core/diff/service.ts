import type { GitAdapter } from "../git";

export class DiffService {
  constructor(private git: GitAdapter) {}

  status(repoRoot: string) {
    return this.git.status(repoRoot);
  }

  diff(repoRoot: string) {
    return this.git.diff(repoRoot);
  }
}
