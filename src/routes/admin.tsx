import { Hono } from 'hono'
import type { Context } from 'hono'
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getSessionUser } from '../lib/auth.ts'
import { postsDir, syncContent } from '../lib/db.ts'
import { parseFrontmatter } from '../lib/md.ts'
import { ForbiddenView, NotFoundView, renderHtml } from '../templates/layout.tsx'
import { AdminEditorView, AdminListView, type AdminPostModel } from '../views/admin.tsx'

export const adminRoutes = new Hono()

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function adminOnly(c: Context): Response | null {
  const user = getSessionUser(c)
  if (!user) {
    return c.redirect('/login?next=' + encodeURIComponent(c.req.path), 302)
  }
  if (user.role !== 'admin') {
    return c.html(renderHtml(c, { title: '需要管理员权限', body: <ForbiddenView /> }), 403)
  }
  return null
}

function fileFor(slug: string): string {
  return join(postsDir, `${slug}.md`)
}

function listPostFiles(): string[] {
  return readdirSync(postsDir).filter((f) => f.endsWith('.md')).sort()
}

function readPostFile(slug: string): AdminPostModel | null {
  const file = fileFor(slug)
  if (!existsSync(file)) return null
  const src = readFileSync(file, 'utf8')
  const { data, body } = parseFrontmatter(src)
  return {
    slug,
    title: String(data.title ?? slug),
    date: String(data.date ?? ''),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    summary: String(data.summary ?? ''),
    series: String(data.series ?? ''),
    published: data.published !== false,
    body,
  }
}

function listAll(): AdminPostModel[] {
  return listPostFiles()
    .map((f) => readPostFile(f.slice(0, -3)))
    .filter((p): p is AdminPostModel => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)))
}

function yamlQuote(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`
}

function serialize(post: AdminPostModel): string {
  const tags = `[${post.tags.map((t) => yamlQuote(t)).join(', ')}]`
  const series = post.series ? `\nseries: ${yamlQuote(post.series)}` : ''
  return `---
title: ${yamlQuote(post.title)}
date: ${post.date}
tags: ${tags}
summary: ${yamlQuote(post.summary)}${series}
published: ${post.published ? 'true' : 'false'}
---

${post.body.trimEnd()}\n`
}

function validateMeta(input: AdminPostModel): string | null {
  if (!SLUG_RE.test(input.slug)) return 'slug 需为小写字母/数字开头的 2-61 位连字符名称'
  if (!DATE_RE.test(input.date)) return '日期格式需为 YYYY-MM-DD'
  if (input.title.length === 0 || input.title.length > 120) return '标题需为 1-120 字'
  if (input.summary.length > 300) return '摘要最长 300 字'
  if (input.series.length > 60) return '系列名最长 60 字'
  if (input.tags.some((t) => t.includes(',') || t.includes('"'))) return '标签内不能包含逗号或双引号'
  if ([input.title, input.summary, input.series].some((s) => s.includes('"'))) {
    return '标题/摘要/系列内不能包含半角双引号 "'
  }
  return null
}

async function readForm(c: Context, slugFromPath?: string): Promise<AdminPostModel> {
  const fd = await c.req.formData()
  const tags = String(fd.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const slug = String(fd.get('slug') ?? '').trim().toLowerCase() || slugFromPath || ''
  return {
    slug,
    title: String(fd.get('title') ?? '').trim(),
    date: String(fd.get('date') ?? '').trim(),
    tags,
    summary: String(fd.get('summary') ?? '').trim(),
    series: String(fd.get('series') ?? '').trim(),
    published: fd.get('published') === '1',
    body: String(fd.get('body') ?? ''),
  }
}

function emptyPost(): AdminPostModel {
  return {
    slug: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    tags: [],
    summary: '',
    series: '',
    published: true,
    body: '',
  }
}

function editorResponse(c: Context, opts: { post: AdminPostModel; action: string; tab: 'list' | 'new'; slugLocked: boolean; error?: string; title: string; status?: 400 }): Response {
  const body = (
    <AdminEditorView post={opts.post} action={opts.action} slugLocked={opts.slugLocked} error={opts.error} tab={opts.tab} previewLabel="预览" />
  )
  return c.html(renderHtml(c, { title: opts.title, active: 'console', body }), opts.status ?? 200)
}

adminRoutes.get('/', (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  const body = <AdminListView rows={listAll()} />
  return c.html(renderHtml(c, { title: '控制台', active: 'console', body }))
})

adminRoutes.get('/new', (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  return editorResponse(c, { post: emptyPost(), action: '/admin/new', tab: 'new', slugLocked: false, title: '写新文章' })
})

adminRoutes.post('/new', async (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  const meta = await readForm(c)
  const err = validateMeta(meta)
  const exists = err === null && meta.slug ? existsSync(fileFor(meta.slug)) : false
  if (err || exists) {
    return editorResponse(c, {
      post: meta,
      action: '/admin/new',
      tab: 'new',
      slugLocked: false,
      error: err ?? '该 slug 已存在',
      title: '写新文章',
      status: 400,
    })
  }
  writeFileSync(fileFor(meta.slug), serialize(meta), 'utf8')
  syncContent()
  return c.redirect('/admin', 303)
})

adminRoutes.get('/:slug/edit', (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  const post = readPostFile(slug)
  if (!post) return c.html(renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  return editorResponse(c, { post, action: `/admin/${slug}/edit`, tab: 'list', slugLocked: true, title: `编辑：${post.title}` })
})

adminRoutes.post('/:slug/edit', async (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  if (!readPostFile(slug)) return c.html(renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  const meta = await readForm(c, slug)
  const err = validateMeta(meta)
  if (err) {
    return editorResponse(c, {
      post: meta,
      action: `/admin/${slug}/edit`,
      tab: 'list',
      slugLocked: true,
      error: err,
      title: `编辑：${meta.title}`,
      status: 400,
    })
  }
  writeFileSync(fileFor(slug), serialize(meta), 'utf8')
  syncContent()
  return c.redirect('/admin', 303)
})

adminRoutes.post('/:slug/delete', (c) => {
  const gate = adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  if (!SLUG_RE.test(slug)) return c.redirect('/admin', 303)
  const file = fileFor(slug)
  if (existsSync(file)) rmSync(file)
  syncContent()
  return c.redirect('/admin', 303)
})
