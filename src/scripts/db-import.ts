import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseMarkdown } from '../lib/content.ts'
import { openDb, savePage, savePost } from '../lib/db.ts'

const archiveRoot = join(import.meta.dir, '..', '..', 'content', 'archive')
const postsDir = join(archiveRoot, 'posts')
const pagesDir = join(archiveRoot, 'pages')

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/

function mdFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
}

openDb()

console.log('db:import 开始（upsert，存在即更新）')
const postFiles = mdFiles(postsDir)
const pageFiles = mdFiles(pagesDir)

for (const file of postFiles) {
  const slug = file.slice(0, -3)
  if (!SLUG_RE.test(slug)) {
    console.log(`  跳过 posts/${file}：非法 slug`)
    continue
  }
  const parsed = parseMarkdown(readFileSync(join(postsDir, file), 'utf8'))
  savePost({ ...parsed, slug })
  console.log(`  posts/${file}`)
}

for (const file of pageFiles) {
  const slug = file.slice(0, -3)
  if (!SLUG_RE.test(slug)) {
    console.log(`  跳过 pages/${file}：非法 slug`)
    continue
  }
  const parsed = parseMarkdown(readFileSync(join(pagesDir, file), 'utf8'))
  savePage({ slug, title: parsed.title, date: parsed.date, body: parsed.body })
  console.log(`  pages/${file}`)
}

console.log(`完成：posts ${postFiles.length} 个，pages ${pageFiles.length} 个`)
