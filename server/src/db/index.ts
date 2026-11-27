import Database from 'better-sqlite3';
import { config } from '../config';
import { SCHEMA_STATEMENTS } from './schema';

export const db = new Database(config.dbFile);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

/** Applies the idempotent schema. Safe to call on every boot. */
export function migrate(): void {
  const transaction = db.transaction(() => {
    for (const statement of SCHEMA_STATEMENTS) db.exec(statement);
  });
  transaction();
}

export type Row = Record<string, unknown>;

/** Parses JSON columns that are stored as TEXT, falling back to a default. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

/** Converts SQLite 0/1 integers into booleans for API consumers. */
export function normaliseRow<T extends Row>(row: T, jsonFields: string[] = [], boolFields: string[] = []): T {
  const next: Row = { ...row };
  for (const field of jsonFields) next[field] = parseJson(row[field], []);
  for (const field of boolFields) next[field] = Boolean(row[field]);
  return next as T;
}

export function count(table: string, where = '1=1', params: unknown[] = []): number {
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`).get(...params) as { total: number };
  return row?.total ?? 0;
}

export function setting(key: string): string | null {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, value);
}

export function nowIso(): string {
  return new Date().toISOString();
}
