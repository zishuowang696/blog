import { Hono } from 'hono'
import { getAdjacentPosts, getPost, listComments } from '../lib/db.ts'
import { getSessionUser } from '../lib/auth.ts'
import { resolveLang } from '../lib/locale.ts'
import { NotFoundView, renderHtml } from '../templates/layout.tsx'
import { PostView } from '../views/post.tsx'

export const postRoutes = new Hono()

postRoutes.get('/:slug', async (c) => {
  const lang = resolveLang(c)
  const slug = c.req.param('slug')
  const post = await getPost(slug, lang)
  if (!post) {
    return c.html(await renderHtml(c, { title: '404', body: <NotFoundView lang={lang} /> }), 404)
  }

  const user = await getSessionUser(c)
  const { older, newer } = await getAdjacentPosts(slug, lang)
  const body = (
    <PostView
      post={post}
      comments={await listComments(slug)}
      user={user}
      older={older}
      newer={newer}
      lang={lang}
    />
  )
  return c.html(await renderHtml(c, { title: post.title, description: post.summary, body }))
})
