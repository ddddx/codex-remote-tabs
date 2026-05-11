import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SQLITE_MIGRATIONS } from './migrations.js';

export type SqliteDatabaseOptions = {
  filePath: string;
};

export function createSqliteDatabase(options: SqliteDatabaseOptions): DatabaseSync {
  const resolved = path.resolve(options.filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const database = new DatabaseSync(resolved);
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');
  applyMigrations(database);
  return database;
}

export function applyMigrations(database: DatabaseSync): void {
  for (const statement of SQLITE_MIGRATIONS) {
    database.exec(statement);
  }
}
