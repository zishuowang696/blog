import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listTags } from '../lib/db.ts'
import { PostList } from '../templates/components.tsx'
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

tagRoutes.get('/', (c) => {
  const body = <TagsIndexView tags={listTags()} />
  return c.html(renderHtml(c, { title: '标签', active: 'tags', body }))
})

tagRoutes.get('/:tag', (c) => {
  const tag = c.req.param('tag')
  const page = pageNum(c)
  const list = listPosts({ page, tag })
  const moreUrl = list.hasMore ? `/tags/${encodeURIComponent(tag)}?page=${page + 1}` : undefined

  if (isHx(c)) {
    return c.html(String(<PostList posts={list.items} moreUrl={moreUrl} />))
  }

  const body = <TagPostsView tag={tag} posts={list.items} moreUrl={moreUrl} total={list.total} />
  return c.html(renderHtml(c, { title: `标签：${tag}`, active: 'tags', body }))
})
