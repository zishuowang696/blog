const vars: Record<string, string> = {}

export function setVars(values: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined) vars[k] = v
  }
}

export function envStr(name: string): string | undefined {
  if (vars[name] !== undefined) return vars[name]
  if (typeof Bun !== 'undefined' && Bun.env) {
    const v = Bun.env[name]
    if (v !== undefined) return v
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[name]
    if (v !== undefined) return v
  }
  return undefined
}

export function envBool(name: string): boolean {
  return envStr(name) === 'true'
}
