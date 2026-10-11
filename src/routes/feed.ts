import { Hono } from 'hono'
import { listRecentPosts } from '../lib/db.ts'
import { envStr } from '../lib/env.ts'
import { langHref, resolveLang } from '../lib/locale.ts'
import { SITE_DESC, SITE_NAME } from '../templates/util.ts'

export const feedRoutes = new Hono()

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function siteUrl(): string {
  return (envStr('SITE_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')
}

feedRoutes.get('/feed.xml', async (c) => {
  const lang = resolveLang(c)
  const base = siteUrl()
  const posts = await listRecentPosts(20, lang)

  const items = posts
    .map((p) => {
      const url = `${base}${langHref(lang, `/posts/${p.slug}`)}`
      return `  <item>
    <title>${esc(p.title)}</title>
    <link>${esc(url)}</link>
    <guid isPermaLink="true">${esc(url)}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${esc(p.summary)}</description>
  </item>`
    })
    .join('\n')

  const self = `${base}${langHref(lang, '/feed.xml')}`
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE_NAME)}</title>
  <link>${esc(`${base}${langHref(lang, '/')}`)}</link>
  <description>${esc(SITE_DESC)}</description>
  <language>${lang === 'zh' ? 'zh-CN' : 'en'}</language>
  <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>`
  return c.body(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8' })
})
