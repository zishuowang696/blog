import type { MiddlewareHandler } from 'hono'

const safe = (s: string | undefined): string => s ?? '-'

export const accessLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now()
  await next()
  const ms = Math.round(performance.now() - start)
  const ua = c.req.header('user-agent')?.slice(0, 80) ?? '-'
  console.log(
    `${new Date().toISOString()} ${c.req.method} ${c.req.path} -> ${c.res.status} ${ms}ms hx=${c.req.header('hx-request') ?? '-'} ip=${safe(c.req.header('x-forwarded-for'))} ua="${ua}"`,
  )
}

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  c.header('X-Frame-Options', 'DENY')
}

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const SENSITIVE = /^(?:\/en)?\/(login|register)$/
const rateHits = new Map<string, { count: number; reset: number }>()

const clientIp = (c: { req: { header: (n: string) => string | undefined } }): string => {
  const cf = c.req.header('cf-connecting-ip')
  if (cf) return cf
  const first = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return first || 'unknown'
}

export const rateLimitSensitive: MiddlewareHandler = async (c, next) => {
  if (!SENSITIVE.test(c.req.path)) return next()
  const ip = clientIp(c)
  const now = Date.now()
  const rec = rateHits.get(ip)
  if (!rec || now > rec.reset) {
    rateHits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS })
  } else if (++rec.count > RATE_MAX) {
    c.header('Retry-After', String(Math.ceil((rec.reset - now) / 1000)))
    return c.text('Too Many Requests', 429)
  }
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) if (now > v.reset) rateHits.delete(k)
  }
  await next()
}
