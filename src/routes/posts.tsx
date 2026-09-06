import { Hono } from 'hono'
import { getAdjacentPosts, getPost, listComments } from '../lib/db.ts'
import { getSessionUser } from '../lib/auth.ts'
import { NotFoundView, renderHtml } from '../templates/layout.tsx'
import { PostView } from '../views/post.tsx'

export const postRoutes = new Hono()

postRoutes.get('/:slug', (c) => {
  const slug = c.req.param('slug')
  const post = getPost(slug)
  if (!post) {
    return c.html(renderHtml(c, { title: '404', body: <NotFoundView /> }), 404)
  }

  const user = getSessionUser(c)
  const { older, newer } = getAdjacentPosts(slug)
  const body = (
    <PostView
      post={post}
      comments={listComments(slug)}
      user={user}
      older={older}
      newer={newer}
    />
  )
  return c.html(renderHtml(c, { title: post.title, description: post.summary, body }))
})
