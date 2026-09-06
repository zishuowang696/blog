import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listTags } from '../lib/db.ts'
import { SearchResults } from '../templates/components.tsx'
import { renderHtml } from '../templates/layout.tsx'
import { SearchView } from '../views/search.tsx'

export const searchRoutes = new Hono()

function qParam(c: Context): string {
  return (c.req.query('q') ?? '').trim()
}

function pageNum(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

function isHx(c: Context): boolean {
  return c.req.header('hx-request') === 'true'
}

searchRoutes.get('/', async (c) => {
  const q = qParam(c)
  const page = pageNum(c)
  const list = await listPosts({ q, page })
  const moreHref =
    list.hasMore && list.items.length > 0 ? `/search?q=${encodeURIComponent(q)}&page=${page + 1}` : undefined

  if (isHx(c)) {
    if (!q) {
      return c.html(String(<SearchResults posts={[]} q="" total={0} />))
    }
    return c.html(String(<SearchResults posts={list.items} q={q} total={list.total} moreHref={moreHref} />))
  }

  const body = (
    <SearchView q={q} posts={list.items} total={list.total} moreHref={moreHref} tags={await listTags()} />
  )
  return c.html(await renderHtml(c, { title: q ? `搜索：${q}` : '搜索', body }))
})
