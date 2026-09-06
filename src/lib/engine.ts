export type SqlValue = string | number | null | Uint8Array

export type EngineRow = Record<string, SqlValue>

export interface RunResult {
  changes: number
  lastInsertRowid: number | null
}

export interface Engine {
  all(sql: string, params?: SqlValue[]): Promise<EngineRow[]>
  first(sql: string, params?: SqlValue[]): Promise<EngineRow | null>
  run(sql: string, params?: SqlValue[]): Promise<RunResult>
}

let engine: Engine | null = null

export function setEngine(e: Engine): void {
  engine = e
}

export function useEngine(): Engine {
  if (!engine) throw new Error('storage engine 未初始化：请先调用 initLocalDb() 或 initD1Db()')
  return engine
}

export function resetEngine(): void {
  engine = null
}
