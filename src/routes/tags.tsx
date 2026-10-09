import { Hono } from 'hono'
import type { Context } from 'hono'
import { listAllPostsMeta, listPosts, listTags } from '../lib/db.ts'
import { langHref, resolveLang, t } from '../lib/locale.ts'
import { renderHtml } from '../templates/layout.tsx'
import { TagsIndexView, TagPostsView } from '../views/tags.tsx'

function pageNum(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

export const tagRoutes = new Hono()

tagRoutes.get('/', async (c) => {
  const lang = resolveLang(c)
  const tags = await listTags()
  const body = <TagsIndexView tags={tags} latest={(await listAllPostsMeta()).slice(0, 6)} lang={lang} />
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title'), active: 'tags', body }))
})

tagRoutes.get('/:tag', async (c) => {
  const lang = resolveLang(c)
  const tag = c.req.param('tag')
  const page = pageNum(c)
  const list = await listPosts({ page, tag, lang })
  const base = `/tags/${encodeURIComponent(tag)}`
  const makeHref = (p: number) => langHref(lang, p === 1 ? base : `${base}?page=${p}`)

  const body = (
    <TagPostsView
      tag={tag}
      posts={list.items}
      page={page}
      totalPages={list.totalPages}
      total={list.total}
      latest={(await listAllPostsMeta()).slice(0, 6)}
      tags={await listTags()}
      makeHref={makeHref}
      lang={lang}
    />
  )
  const query = page > 1 ? `?page=${page}` : undefined
  const prev = page > 1 ? makeHref(page - 1) : undefined
  const next = page < list.totalPages ? makeHref(page + 1) : undefined
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title_one', { tag }), active: 'tags', query, prev, next, body }))
})
