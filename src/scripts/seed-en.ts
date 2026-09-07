import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMarkdown } from '../lib/content.ts'
import { renderMarkdown } from '../lib/md.ts'
import { useEngine } from '../lib/engine.ts'
import { initLocalDb } from '../lib/engine/sqlite.ts'

export interface EnArticle {
  slug: string
  title_en: string
  summary_en: string
  body_en: string
  content_html_en: string
}

const enDir = join(import.meta.dir, '..', '..', 'content', 'en')

export function loadEnArticles(): EnArticle[] {
  const files = readdirSync(enDir).filter((f) => f.endsWith('.md')).sort()
  return files.map((file) => {
    const slug = file.slice(0, -3)
    const p = parseMarkdown(readFileSync(join(enDir, file), 'utf8'))
    return {
      slug,
      title_en: p.title,
      summary_en: p.summary,
      body_en: p.body,
      content_html_en: renderMarkdown(p.body),
    }
  })
}

if (import.meta.main) {
  await initLocalDb()
  const e = useEngine()
  const articles = loadEnArticles()
  for (const a of articles) {
    await e.run(
      'UPDATE posts SET title_en = ?, summary_en = ?, body_en = ?, content_html_en = ? WHERE slug = ?',
      [a.title_en, a.summary_en, a.body_en, a.content_html_en, a.slug],
    )
    console.log(`  en: ${a.slug}`)
  }
  writeFileSync('/tmp/en-payload.json', JSON.stringify(articles, null, 2))
  console.log(`done ${articles.length}; /tmp/en-payload.json written`)
}
