import { execa } from "execa";

// TODO: restrict to tracked files (git ls-files) and skip node_modules
export async function applyWorkspaceToRoot(workspacePath: string, repoRoot: string) {
  await execa("rsync", ["-a", "--delete", workspacePath + "/", repoRoot + "/"]);
}
