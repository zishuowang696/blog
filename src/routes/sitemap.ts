import { Hono } from 'hono'
import { listAllPostsMeta, listTags } from '../lib/db.ts'
import { envStr } from '../lib/env.ts'
import { SITE_DESC, SITE_NAME } from '../templates/util.ts'

export const sitemapRoutes = new Hono()

function siteUrl(): string {
  return (envStr('SITE_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function day(iso: string): string {
  return (iso || '').slice(0, 10)
}

sitemapRoutes.get('/sitemap.xml', async (c) => {
  const base = siteUrl()
  const posts = await listAllPostsMeta()
  const today = new Date().toISOString().slice(0, 10)

  // 每个语言无关路径产出 zh + en 两个入口，并互相声明 hreflang
  const pair = (path: string, lastmod: string, changefreq: string): string => {
    const zh = `${base}${path}`
    const en = `${base}/en${path}`
    const alts =
      `<xhtml:link rel="alternate" hreflang="zh-CN" href="${zh}"/>` +
      `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${zh}"/>`
    return [
      `<url><loc>${zh}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq>${alts}</url>`,
      `<url><loc>${en}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq>${alts}</url>`,
    ].join('\n')
  }

  const staticUrls = ['', '/tags', '/about'].map((p) => pair(p, today, p === '' ? 'daily' : 'weekly'))

  const tagUrls = (await listTags()).map((t) =>
    pair(`/tags/${xmlEscape(encodeURIComponent(t.name))}`, today, 'weekly'),
  )

  const postUrls = posts.map((p) => pair(`/posts/${xmlEscape(p.slug)}`, xmlEscape(day(p.date) || today), 'monthly'))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticUrls.join('\n')}
${tagUrls.join('\n')}
${postUrls.join('\n')}
</urlset>`
  return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

// 爬虫协议：sitemap 必须是绝对 URL；显式放行主流 AI 爬虫（想被 AI 引用就要允许）。
sitemapRoutes.get('/robots.txt', (c) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# AI crawlers (allowed)',
    'User-agent: GPTBot',
    'Allow: /',
    'User-agent: ClaudeBot',
    'Allow: /',
    'User-agent: PerplexityBot',
    'Allow: /',
    'User-agent: Google-Extended',
    'Allow: /',
    'User-agent: CCBot',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl()}/sitemap.xml`,
    '',
  ].join('\n')
  return c.body(body, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

// llms.txt：给 AI/Agent 的站点索引（新兴约定，被多个 AI 工具读取）。
sitemapRoutes.get('/llms.txt', async (c) => {
  const base = siteUrl()
  const posts = await listAllPostsMeta()
  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESC}`,
    '',
    '## Posts',
    ...posts.map((p) => `- [${p.title}](${base}/posts/${p.slug})`),
    '',
    '## Index',
    `- [Home](${base}/)`,
    `- [Tags](${base}/tags)`,
    `- [About](${base}/about)`,
    '',
  ].join('\n')
  return c.body(body, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})
