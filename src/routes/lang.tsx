import { Hono } from 'hono'
import { langOf, setLangCookie } from '../lib/locale.ts'

export const langRoutes = new Hono()

langRoutes.get('/', (c) => {
  const raw = c.req.query('lang')
  const nextRaw = c.req.query('next')
  const next = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/'
  setLangCookie(c, langOf(raw))
  return c.redirect(next, 303)
})
