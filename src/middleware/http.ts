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
