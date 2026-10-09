import { Hono } from 'hono'
import type { Context } from 'hono'
import { listAllPostsMeta, listPosts, listTags } from '../lib/db.ts'
import { langHref, resolveLang, t } from '../lib/locale.ts'
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
  const tags = await listTags()
  const body = <TagsIndexView tags={tags} latest={(await listAllPostsMeta()).slice(0, 6)} lang={lang} />
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title'), active: 'tags', body }))
})

tagRoutes.get('/:tag', async (c) => {
  const lang = resolveLang(c)
  const tag = c.req.param('tag')
  const page = pageNum(c)
  const list = await listPosts({ page, tag, lang })
  const moreUrl = list.hasMore ? langHref(lang, `/tags/${encodeURIComponent(tag)}?page=${page + 1}`) : undefined

  if (isHx(c)) {
    return c.html(String(<ListChunk posts={list.items} moreUrl={moreUrl} lang={lang} />))
  }

  const body = (
    <TagPostsView
      tag={tag}
      posts={list.items}
      moreUrl={moreUrl}
      total={list.total}
      latest={(await listAllPostsMeta()).slice(0, 6)}
      tags={await listTags()}
      lang={lang}
    />
  )
  return c.html(await renderHtml(c, { title: t(lang, 'tags.title_one', { tag }), active: 'tags', body }))
})
