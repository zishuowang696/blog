import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMarkdown, renderPageSource, renderPostSource } from '../lib/content.ts'
import { renderMarkdown } from '../lib/md.ts'

const archiveRoot = join(import.meta.dir, '..', '..', 'content', 'archive')
const postsDir = join(archiveRoot, 'posts')
const pagesDir = join(archiveRoot, 'pages')
const outFile = join(import.meta.dir, '..', '..', 'db', 'seed-d1.sql')

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/

function mdFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
}

function esc(s: string): string {
  return s.replace(/'/g, "''")
}

const lines: string[] = []
lines.push('-- 由 src/scripts/d1-seed.ts 生成：D1 首灌种子（posts/pages/tags/post_tags）')

for (const file of mdFiles(postsDir)) {
  const slug = file.slice(0, -3)
  if (!SLUG_RE.test(slug)) continue
  const p = parseMarkdown(readFileSync(join(postsDir, file), 'utf8'))
  const source = renderPostSource({ ...p, slug })
  const html = renderMarkdown(p.body)
  const updated = new Date().toISOString()
  lines.push(`INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
  VALUES ('${esc(slug)}', '${esc(p.title)}', '${esc(p.summary)}', '${esc(html)}', '${esc(source)}', '${esc(p.series)}', ${p.published ? 1 : 0}, '${p.date}', '${updated}')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at;`)
  for (const tag of p.tags) {
    lines.push(`INSERT INTO tags (name) VALUES ('${esc(tag)}') ON CONFLICT(name) DO NOTHING;`)
    lines.push(`INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = '${esc(slug)}' AND t.name = '${esc(tag)}'
  ON CONFLICT DO NOTHING;`)
  }
}

for (const file of mdFiles(pagesDir)) {
  const slug = file.slice(0, -3)
  if (!SLUG_RE.test(slug)) continue
  const p = parseMarkdown(readFileSync(join(pagesDir, file), 'utf8'))
  const source = renderPageSource({ slug, title: p.title, date: p.date, body: p.body })
  const html = renderMarkdown(p.body)
  const updated = new Date().toISOString()
  lines.push(`INSERT INTO pages (slug, title, content_html, source_md, created_at, updated_at)
  VALUES ('${esc(slug)}', '${esc(p.title)}', '${esc(html)}', '${esc(source)}', '${p.date}', '${updated}')
  ON CONFLICT(slug) DO UPDATE SET title = excluded.title, content_html = excluded.content_html, source_md = excluded.source_md, updated_at = excluded.updated_at;`)
}

writeFileSync(outFile, lines.join('\n') + '\n')
console.log(`已生成 ${outFile}（posts 种子 ${mdFiles(postsDir).length}，pages ${mdFiles(pagesDir).length}）`)
