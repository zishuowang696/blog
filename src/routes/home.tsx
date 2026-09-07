import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listTags, POSTS_PER_PAGE } from '../lib/db.ts'
import { ListChunk } from '../templates/components.tsx'
import { renderHtml } from '../templates/layout.tsx'
import { HomeView } from '../views/home.tsx'

function pageParam(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

function isHx(c: Context): boolean {
  return c.req.header('hx-request') === 'true'
}

export const homeRoutes = new Hono()

homeRoutes.get('/', async (c) => {
  const page = pageParam(c)
  const list = await listPosts({ page })
  const moreUrl = list.hasMore ? `/?page=${page + 1}` : undefined

  if (isHx(c)) {
    return c.html(String(<ListChunk posts={list.items} moreUrl={moreUrl} />))
  }

  const body = <HomeView posts={list.items} moreUrl={moreUrl} page={page} tags={await listTags()} postsPerPage={POSTS_PER_PAGE} />
  return c.html(await renderHtml(c, { title: 'Home', active: 'home', body }))
})
