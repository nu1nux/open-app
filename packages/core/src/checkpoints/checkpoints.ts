import { execa } from "execa";

export async function createCheckpoint(repoRoot: string, workspaceId: string, turnSeq: number) {
  const ref = `refs/open-app/checkpoints/${workspaceId}/${turnSeq}`;
  const { stdout } = await execa("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
  await execa("git", ["update-ref", ref, stdout.trim()], { cwd: repoRoot });
  return ref;
}
