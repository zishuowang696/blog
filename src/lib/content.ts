import type { FrontmatterValue } from './md.ts'
import { parseFrontmatter } from './md.ts'

export interface PostInput {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  series: string
  published: boolean
  body: string
}

export interface PageInput {
  slug: string
  title: string
  date: string
  body: string
}

export interface ParsedMarkdown {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  series: string
  published: boolean
  body: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}/

function str(v: FrontmatterValue | undefined): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function arr(v: FrontmatterValue | undefined): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean)
  const s = str(v).trim()
  return s === '' ? [] : s.split(',').map((x) => x.trim()).filter(Boolean)
}

export function resolveDate(v: FrontmatterValue | undefined): string {
  const s = str(v)
  return DATE_RE.test(s) ? s.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

export function parseMarkdown(raw: string): ParsedMarkdown {
  const { data, body } = parseFrontmatter(raw)
  return {
    slug: '',
    title: str(data.title),
    date: resolveDate(data.date),
    tags: arr(data.tags),
    summary: str(data.summary),
    series: str(data.series),
    published: data.published !== false,
    body: body.trimStart().replace(/^\s*\n/, ''),
  }
}

function yamlQuote(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`
}

export function renderPostSource(p: PostInput): string {
  const tags = p.tags.length > 0 ? `[${p.tags.map((t) => yamlQuote(t)).join(', ')}]` : '[]'
  const series = p.series ? `\nseries: ${yamlQuote(p.series)}` : ''
  return `---
title: ${yamlQuote(p.title)}
date: ${p.date}
tags: ${tags}
summary: ${yamlQuote(p.summary)}${series}
published: ${p.published ? 'true' : 'false'}
---

${p.body.trimEnd()}\n`
}

export function renderPageSource(p: PageInput): string {
  return `---
title: ${yamlQuote(p.title)}
date: ${p.date}
---

${p.body.trimEnd()}\n`
}

export function tagsFromText(raw: string): string[] {
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}
