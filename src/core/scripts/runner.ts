/**
 * @fileoverview Script runner for executing shell commands.
 * Supports concurrent and non-concurrent script execution modes.
 * @module core/scripts/runner
 */

import { spawn } from "node:child_process";

/**
 * Runner class for executing shell scripts.
 */
export class ScriptRunner {
  /** Currently running process info */
  private current: { pid: number } | null = null;

  /**
   * Runs a shell command.
   * @param {string} command - The command to execute
   * @param {string} cwd - Working directory for the command
   * @param {boolean} nonconcurrent - If true, kills previous process before starting new one
   */
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
