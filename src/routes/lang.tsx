import { Hono } from 'hono'
import { EN_PREFIX, stripLang, type Lang } from '../lib/locale.ts'

export const langRoutes = new Hono()

// /lang?lang=en|zh&next=/some/path -> 302 到带前缀的对应地址（保持 URL 决定语言）
langRoutes.get('/', (c) => {
  const lang: Lang = c.req.query('lang') === 'en' ? 'en' : 'zh'
  const raw = c.req.query('next')
  const safe = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
  const base = stripLang(safe)
  const target = lang === 'en' ? (base === '/' ? EN_PREFIX : EN_PREFIX + base) : base
  return c.redirect(target, 302)
})
