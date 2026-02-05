/**
 * @fileoverview SQLite database initialization and connection.
 * Creates and configures the application database with required tables.
 * @module core/storage/db
 */

import Database from "better-sqlite3";

/**
 * Opens or creates a SQLite database at the specified path.
 * Initializes the workspaces table if it doesn't exist.
 * @param {string} path - File path for the database
 * @returns {Database.Database} The database connection
 */
export function openDb(path: string): Database.Database {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      repoRoot TEXT NOT NULL,
      path TEXT NOT NULL,
      branch TEXT NOT NULL,
      baseBranch TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      archivedAt INTEGER
    );
  `);
  return db;
}
