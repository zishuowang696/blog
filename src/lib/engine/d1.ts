import { setEngine, type Engine, type EngineRow, type RunResult, type SqlValue } from '../engine.ts'

interface D1Stmt {
  bind(...values: unknown[]): D1Stmt
  all(): Promise<{ results: unknown[] }>
  first(): Promise<unknown>
  run(): Promise<{ meta: { changes: number; last_row_id: number | null } }>
}

interface D1BindingLike {
  prepare(sql: string): D1Stmt
}

export async function initD1Db(binding: unknown): Promise<void> {
  const db = binding as D1BindingLike
  const engine: Engine = {
    all(sql, params = []) {
      let stmt = db.prepare(sql)
      if (params.length > 0) stmt = stmt.bind(...params)
      return stmt.all().then((r) => (r.results as EngineRow[]) ?? [])
    },
    first(sql, params = []) {
      let stmt = db.prepare(sql)
      if (params.length > 0) stmt = stmt.bind(...params)
      return stmt.first().then((r) => (r ? (r as EngineRow) : null))
    },
    async run(sql, params = []) {
      let stmt = db.prepare(sql)
      if (params.length > 0) stmt = stmt.bind(...params)
      const { meta } = await stmt.run()
      return { changes: meta.changes, lastInsertRowid: meta.last_row_id } as RunResult
    },
  }
  setEngine(engine)
}

export type { SqlValue }
