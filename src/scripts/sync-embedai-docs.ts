import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface Entry {
  doc: string
  slug: string
}

const root = join(import.meta.dir, '..', '..')
const manifestPath = join(root, 'content', 'docs-manifest.json')
const snapDir = join(root, 'content', 'upstream', 'embedai')
const refFile = join(snapDir, 'REF')
const changesFile = join(snapDir, 'CHANGES.md')

const embedaiDir = process.env.EMBEDAI_DIR || (process.argv[2] ?? '')
if (!embedaiDir || !existsSync(embedaiDir)) {
  console.error('用法：EMBEDAI_DIR=<embedai 克隆目录> bun src/scripts/sync-embedai-docs.ts')
  process.exit(1)
}

function git(args: string): string {
  return execSync(`git -C ${embedaiDir} ${args}`, { encoding: 'utf8' }).trim()
}

const ref = git('rev-parse HEAD')
if (existsSync(refFile) && readFileSync(refFile, 'utf8').trim() === ref) {
  console.log(`embedai docs 无变化（已同步到 ${ref.slice(0, 8)}）`)
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Entry[]
mkdirSync(snapDir, { recursive: true })

const changed: string[] = []
for (const entry of manifest) {
  const src = join(embedaiDir, entry.doc)
  if (!existsSync(src)) {
    console.warn(`  跳过 ${entry.doc}：源文件不存在`)
    continue
  }
  const content = readFileSync(src, 'utf8')
  const dest = join(snapDir, `${entry.slug}.md`)
  const changedNow = !existsSync(dest) || readFileSync(dest, 'utf8') !== content
  writeFileSync(dest, content)
  if (changedNow) {
    changed.push(entry.slug)
    console.log(`  更新 ${entry.slug} <- ${entry.doc}`)
  }
}

writeFileSync(refFile, `${ref}\n`)
if (changed.length > 0) {
  const old = existsSync(changesFile) ? readFileSync(changesFile, 'utf8') : ''
  const line = `- \`${ref.slice(0, 8)}\` ${changed.join(', ')} 的 embedai 源 doc 有更新，请人工更新中文文章与英文版后走发布流程`
  writeFileSync(changesFile, `${old}\n${line}`)
}

console.log(`done：ref=${ref.slice(0, 8)}，变更 ${changed.length} 篇`)
