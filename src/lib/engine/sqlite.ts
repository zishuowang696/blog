import { Database } from 'bun:sqlite'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { SCHEMA_SQL } from '../schema.ts'
import { setEngine, type Engine, type EngineRow, type RunResult, type SqlValue } from '../engine.ts'

const bundled = (import.meta.dir ?? '').includes('$bunfs')
export const rootDir = Bun.env.BLOG_ROOT
  ? resolve(Bun.env.BLOG_ROOT)
  : bundled
    ? process.cwd()
    : resolve(import.meta.dir, '..', '..', '..')
export const dbFile = Bun.env.BLOG_DB_FILE
  ? resolve(Bun.env.BLOG_DB_FILE)
  : join(rootDir, 'db', 'blog.sqlite')

let handle: Database | null = null

function ensureColumn(table: string, column: string, ddl: string): void {
  const cols = handle!.query(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    handle!.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
  }
}

function normalize(row: unknown): EngineRow {
  return row as EngineRow
}

function toNum(v: number | bigint | undefined): number {
  return v === undefined ? 0 : Number(v)
}

export async function initLocalDb(): Promise<void> {
  if (handle) return
  mkdirSync(join(rootDir, 'db'), { recursive: true })
  handle = new Database(dbFile)
  handle.exec('PRAGMA journal_mode = WAL;')
  handle.exec('PRAGMA foreign_keys = ON;')
  handle.exec(SCHEMA_SQL)
  ensureColumn('posts', 'source_md', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('pages', 'source_md', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('posts', 'title_en', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('posts', 'summary_en', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('posts', 'body_en', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('posts', 'content_html_en', "TEXT NOT NULL DEFAULT ''")

  const engine: Engine = {
    all(sql, params = []) {
      const rows = handle!.query(sql).all(...params) as unknown[]
      return Promise.resolve(rows.map(normalize))
    },
    first(sql, params = []) {
      const row = handle!.query(sql).get(...params)
      return Promise.resolve(row ? normalize(row) : null)
    },
    run(sql, params = []) {
      const res = handle!.query(sql).run(...params)
      const result: RunResult = { changes: toNum(res.changes), lastInsertRowid: res.lastInsertRowid == null ? null : toNum(res.lastInsertRowid) }
      return Promise.resolve(result)
    },
  }
  setEngine(engine)
}

export type { SqlValue }
