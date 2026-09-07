import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listTags } from '../lib/db.ts'
import { resolveLang, t } from '../lib/locale.ts'
import { ListChunk } from '../templates/components.tsx'
import { renderHtml } from '../templates/layout.tsx'
import { TagsIndexView, TagPostsView } from '../views/tags.tsx'

function pageNum(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

function isHx(c: Context): boolean {
  return c.req.header('hx-request') === 'true'
}

export const tagRoutes = new Hono()

tagRoutes.get('/', async (c) => {
  const lang = resolveLang(c)
  const body = <TagsIndexView tags={await listTags()} lang={lang} />
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title'), active: 'tags', body }))
})

tagRoutes.get('/:tag', async (c) => {
  const lang = resolveLang(c)
  const tag = c.req.param('tag')
  const page = pageNum(c)
  const list = await listPosts({ page, tag, lang })
  const moreUrl = list.hasMore ? `/tags/${encodeURIComponent(tag)}?page=${page + 1}` : undefined

  if (isHx(c)) {
    return c.html(String(<ListChunk posts={list.items} moreUrl={moreUrl} lang={lang} />))
  }

  const body = <TagPostsView tag={tag} posts={list.items} moreUrl={moreUrl} total={list.total} lang={lang} />
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title_one', { tag }), active: 'tags', body }))
})
