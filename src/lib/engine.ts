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
  if (!engine) throw new Error('storage engine not initialized: call initLocalDb() or initD1Db() first')
  return engine
}

export function resetEngine(): void {
  engine = null
}
