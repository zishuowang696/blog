import { Hono } from 'hono'
import type { Context } from 'hono'
import { getSessionUser } from '../lib/auth.ts'
import type { PageInput, PostInput } from '../lib/content.ts'
import { parseMarkdown, tagsFromText } from '../lib/content.ts'
import {
  deletePage,
  deletePost,
  getPage,
  getPostSource,
  listAllPagesMeta,
  listAllPostsMeta,
  savePage,
  savePost,
  type Post,
} from '../lib/db.ts'
import { ForbiddenView, NotFoundView, renderHtml } from '../templates/layout.tsx'
import {
  AdminEditorView,
  AdminImportView,
  AdminListView,
  AdminPageEditorView,
  AdminPagesView,
  type ImportResult,
} from '../views/admin.tsx'

export const adminRoutes = new Hono()

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,60}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function adminOnly(c: Context): Promise<Response | null> {
  const user = await getSessionUser(c)
  if (!user) {
    return c.redirect('/login?next=' + encodeURIComponent(c.req.path), 302)
  }
  if (user.role !== 'admin') {
    return c.html(await renderHtml(c, { title: '需要管理员权限', body: <ForbiddenView /> }), 403)
  }
  return null
}

function validatePost(p: PostInput): string | null {
  if (!SLUG_RE.test(p.slug)) return 'slug 需为小写字母/数字开头的 2-61 位连字符名称'
  if (!DATE_RE.test(p.date)) return '日期格式需为 YYYY-MM-DD'
  if (p.title.length === 0 || p.title.length > 120) return '标题需为 1-120 字'
  if (p.summary.length > 300) return '摘要最长 300 字'
  if (p.series.length > 60) return '系列名最长 60 字'
  if (p.tags.some((t) => t.includes(',') || t.includes('"'))) return '标签内不能包含逗号或双引号'
  if ([p.title, p.summary, p.series].some((s) => s.includes('"'))) return '标题/摘要/系列内不能包含半角双引号 "'
  return null
}

function validatePage(p: PageInput): string | null {
  if (!SLUG_RE.test(p.slug)) return 'slug 不合法'
  if (!DATE_RE.test(p.date)) return '日期格式需为 YYYY-MM-DD'
  if (p.title.length === 0 || p.title.length > 120) return '标题需为 1-120 字'
  if (p.title.includes('"')) return '标题内不能包含半角双引号 "'
  return null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function pageFromPostSource(post: Post): PostInput {
  const parsed = parseMarkdown(post.source_md || '')
  return {
    slug: post.slug,
    title: parsed.title || post.title,
    date: parsed.date || post.created_at.slice(0, 10),
    tags: parsed.tags.length > 0 ? parsed.tags : post.tags,
    summary: parsed.summary || post.summary,
    series: parsed.series || post.series,
    published: post.published,
    body: parsed.body,
  }
}

async function readPostForm(c: Context, slugFromPath?: string): Promise<PostInput> {
  const fd = await c.req.formData()
  const slug = String(fd.get('slug') ?? '').trim().toLowerCase() || slugFromPath || ''
  return {
    slug,
    title: String(fd.get('title') ?? '').trim(),
    date: String(fd.get('date') ?? '').trim(),
    tags: tagsFromText(String(fd.get('tags') ?? '')),
    summary: String(fd.get('summary') ?? '').trim(),
    series: String(fd.get('series') ?? '').trim(),
    published: fd.get('published') === '1',
    body: String(fd.get('body') ?? ''),
  }
}

async function readPageForm(c: Context, slug: string): Promise<PageInput> {
  const fd = await c.req.formData()
  return {
    slug,
    title: String(fd.get('title') ?? '').trim(),
    date: String(fd.get('date') ?? '').trim(),
    body: String(fd.get('body') ?? ''),
  }
}

async function renderEditor(
  c: Context,
  opts: { post: PostInput; action: string; heading: string; slugLocked: boolean; error?: string; title: string; status?: 400 },
): Promise<Response> {
  const body = <AdminEditorView post={opts.post} action={opts.action} heading={opts.heading} slugLocked={opts.slugLocked} error={opts.error} />
  return c.html(await renderHtml(c, { title: opts.title, active: 'console', body }), opts.status ?? 200)
}

adminRoutes.get('/', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const body = <AdminListView rows={await listAllPostsMeta()} />
  return c.html(await renderHtml(c, { title: '控制台', active: 'console', body }))
})

adminRoutes.get('/new', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  return renderEditor(c, {
    post: { slug: '', title: '', date: today(), tags: [], summary: '', series: '', published: true, body: '' },
    action: '/admin/new',
    heading: '写新文章',
    slugLocked: false,
    title: '写新文章',
  })
})

adminRoutes.post('/new', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const post = await readPostForm(c)
  const err = validatePost(post)
  const dup = !err && (await getPostSource(post.slug)) !== null
  if (err || dup) {
    return renderEditor(c, {
      post,
      action: '/admin/new',
      heading: '写新文章',
      slugLocked: false,
      error: err ?? '该 slug 已存在，请编辑已有文章',
      title: '写新文章',
      status: 400,
    })
  }
  await savePost(post)
  return c.redirect('/admin', 303)
})

adminRoutes.get('/import', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const body = <AdminImportView />
  return c.html(await renderHtml(c, { title: '导入 Markdown', active: 'console', body }))
})

adminRoutes.post('/import', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const fd = await c.req.formData()
  const results: ImportResult[] = []
  for (const entry of fd.getAll('files')) {
    if (typeof entry === 'string' || typeof (entry as File).text !== 'function') continue
    const file = entry as File
    const name = file.name || ''
    if (!name.toLowerCase().endsWith('.md')) {
      results.push({ slug: name, title: '', status: 'error', message: '不是 .md 文件' })
      continue
    }
    const slug = name.slice(0, -3).toLowerCase()
    if (!SLUG_RE.test(slug)) {
      results.push({ slug, title: '', status: 'error', message: '文件名不符合 slug 规则' })
      continue
    }
    const raw = await file.text()
    const parsed = parseMarkdown(raw)
    const post: PostInput = {
      slug,
      title: parsed.title || slug,
      date: parsed.date,
      tags: parsed.tags,
      summary: parsed.summary,
      series: parsed.series,
      published: parsed.published,
      body: parsed.body,
    }
    const err = validatePost(post)
    if (err) {
      results.push({ slug, title: post.title, status: 'error', message: err })
      continue
    }
    await savePost(post)
    results.push({ slug, title: post.title, status: 'ok', message: '' })
  }
  if (results.length === 0) {
    results.push({ slug: '-', title: '', status: 'error', message: '未收到 .md 文件' })
  }
  const body = <AdminImportView results={results} />
  return c.html(await renderHtml(c, { title: '导入 Markdown', active: 'console', body }))
})

adminRoutes.get('/pages', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const body = <AdminPagesView pages={await listAllPagesMeta()} />
  return c.html(await renderHtml(c, { title: '静态页面', active: 'console', body }))
})

adminRoutes.get('/pages/:slug/edit', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  const page = await getPage(slug)
  if (!page) return c.html(await renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  const parsed = parseMarkdown(page.source_md || '')
  const input: PageInput = {
    slug: page.slug,
    title: parsed.title || page.title,
    date: parsed.date || page.created_at.slice(0, 10),
    body: parsed.body,
  }
  const body = <AdminPageEditorView page={input} action={`/admin/pages/${page.slug}/edit`} />
  return c.html(await renderHtml(c, { title: `编辑：${page.title}`, active: 'console', body }))
})

adminRoutes.post('/pages/:slug/edit', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  if (!(await getPage(slug))) return c.html(await renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  const input = await readPageForm(c, slug)
  const err = validatePage(input)
  if (err) {
    const body = <AdminPageEditorView page={input} action={`/admin/pages/${slug}/edit`} error={err} />
    return c.html(await renderHtml(c, { title: `编辑：${input.title}`, active: 'console', body }), 400)
  }
  await savePage(input)
  return c.redirect('/admin/pages', 303)
})

adminRoutes.get('/:slug/edit', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  const post = await getPostSource(slug)
  if (!post) return c.html(await renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  return renderEditor(c, {
    post: pageFromPostSource(post),
    action: `/admin/${slug}/edit`,
    heading: `编辑：${post.title}`,
    slugLocked: true,
    title: `编辑：${post.title}`,
  })
})

adminRoutes.post('/:slug/edit', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  const existing = await getPostSource(slug)
  if (!existing) return c.html(await renderHtml(c, { title: '未找到', body: <NotFoundView /> }), 404)
  const post = await readPostForm(c, slug)
  const err = validatePost(post)
  if (err) {
    return renderEditor(c, {
      post,
      action: `/admin/${slug}/edit`,
      heading: `编辑：${post.title}`,
      slugLocked: true,
      error: err,
      title: `编辑：${post.title}`,
      status: 400,
    })
  }
  await savePost(post)
  return c.redirect('/admin', 303)
})

adminRoutes.post('/:slug/delete', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  if (SLUG_RE.test(slug)) await deletePost(slug)
  return c.redirect('/admin', 303)
})

adminRoutes.post('/pages/:slug/delete', async (c) => {
  const gate = await adminOnly(c)
  if (gate) return gate
  const slug = c.req.param('slug')
  if (SLUG_RE.test(slug)) await deletePage(slug)
  return c.redirect('/admin/pages', 303)
})
