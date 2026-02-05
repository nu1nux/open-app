import type { Workspace } from '../../shared';
import { openDb } from "./db";

export class WorkspaceRepo {
  constructor(private dbPath: string) {}

  list(repoRoot: string): Workspace[] {
    const db = openDb(this.dbPath);
    return db.prepare("SELECT * FROM workspaces WHERE repoRoot = ?").all(repoRoot) as Workspace[];
  }

  insert(ws: Workspace): void {
    const db = openDb(this.dbPath);
    db.prepare(
      "INSERT INTO workspaces (id, repoRoot, path, branch, baseBranch, createdAt, archivedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ws.id, ws.repoRoot, ws.path, ws.branch, ws.baseBranch, ws.createdAt, ws.archivedAt ?? null);
  }

  archive(id: string, archivedAt: number): void {
    const db = openDb(this.dbPath);
    db.prepare("UPDATE workspaces SET archivedAt = ? WHERE id = ?").run(archivedAt, id);
  }
}
