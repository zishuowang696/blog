import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listTags, POSTS_PER_PAGE } from '../lib/db.ts'
import { PostList } from '../templates/components.tsx'
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

homeRoutes.get('/', (c) => {
  const page = pageParam(c)
  const list = listPosts({ page })
  const moreUrl = list.hasMore ? `/?page=${page + 1}` : undefined

  if (isHx(c)) {
    return c.html(String(<PostList posts={list.items} moreUrl={moreUrl} />))
  }

  const body = <HomeView posts={list.items} moreUrl={moreUrl} page={page} tags={listTags()} postsPerPage={POSTS_PER_PAGE} />
  return c.html(renderHtml(c, { title: '首页', active: 'home', body }))
})
