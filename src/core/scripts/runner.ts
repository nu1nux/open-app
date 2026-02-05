import { spawn } from "node:child_process";

export class ScriptRunner {
  private current: { pid: number } | null = null;

  run(command: string, cwd: string, nonconcurrent: boolean): void {
    if (nonconcurrent && this.current?.pid) {
      process.kill(-this.current.pid, "SIGTERM");
    }

    const child = spawn("zsh", ["-lc", command], {
      cwd,
      detached: true,
      stdio: "inherit"
    });

    this.current = child.pid ? { pid: child.pid } : null;
  }
}
