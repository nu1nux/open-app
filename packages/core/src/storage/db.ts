import Database from "better-sqlite3";

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
