import { Hono } from 'hono'
import { listPosts, listTags } from '../lib/db.ts'

export const sitemapRoutes = new Hono()

function siteUrl(): string {
  const base = process.env.SITE_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000'
  return base
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

sitemapRoutes.get('/sitemap.xml', (c) => {
  const base = siteUrl()
  const posts = listPosts({ page: 1 }).items
  const today = new Date().toISOString().slice(0, 10)

  const staticUrls = ['', '/tags', '/about', '/search'].map((p) => {
    const path = p === '' ? '' : p
    const lastmod = p === '' ? today : today
    return `<url><loc>${base}${path}</loc><lastmod>${lastmod}</lastmod><changefreq>${p === '' ? 'daily' : 'weekly'}</changefreq></url>`
  })

  const tagUrls = listTags().map(
    (t) => `<url><loc>${base}/tags/${xmlEscape(encodeURIComponent(t.name))}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq></url>`,
  )

  const postUrls = posts.map(
    (p) => `<url><loc>${base}/posts/${xmlEscape(p.slug)}</loc><lastmod>${xmlEscape(p.created_at)}</lastmod><changefreq>monthly</changefreq></url>`,
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${tagUrls.join('\n')}
${postUrls.join('\n')}
</urlset>`
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})
