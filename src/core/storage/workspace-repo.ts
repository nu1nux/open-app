/**
 * @fileoverview Repository for workspace data persistence.
 * Handles CRUD operations for workspaces in the SQLite database.
 * @module core/storage/workspace-repo
 */

import type { Workspace } from '../../shared';
import { openDb } from "./db";

/**
 * Repository class for managing workspace persistence.
 */
export class WorkspaceRepo {
  /**
   * Creates a new WorkspaceRepo instance.
   * @param {string} dbPath - Path to the SQLite database file
   */
  constructor(private dbPath: string) {}

  /**
   * Lists all workspaces for a given repository root.
   * @param {string} repoRoot - Root path of the git repository
   * @returns {Workspace[]} Array of workspaces
   */
  list(repoRoot: string): Workspace[] {
    const db = openDb(this.dbPath);
    return db.prepare("SELECT * FROM workspaces WHERE repoRoot = ?").all(repoRoot) as Workspace[];
  }

  /**
   * Inserts a new workspace into the database.
   * @param {Workspace} ws - The workspace to insert
   */
  insert(ws: Workspace): void {
    const db = openDb(this.dbPath);
    db.prepare(
      "INSERT INTO workspaces (id, repoRoot, path, branch, baseBranch, createdAt, archivedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ws.id, ws.repoRoot, ws.path, ws.branch, ws.baseBranch, ws.createdAt, ws.archivedAt ?? null);
  }

  /**
   * Archives a workspace by setting its archivedAt timestamp.
   * @param {string} id - The workspace ID to archive
   * @param {number} archivedAt - Unix timestamp of when the workspace was archived
   */
  archive(id: string, archivedAt: number): void {
    const db = openDb(this.dbPath);
    db.prepare("UPDATE workspaces SET archivedAt = ? WHERE id = ?").run(archivedAt, id);
  }
}
