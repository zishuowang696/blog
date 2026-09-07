import { Hono } from 'hono'
import type { Context } from 'hono'
import { createComment, deleteComment, getCommentById, listComments, type Comment } from '../lib/db.ts'
import type { User } from '../lib/db.ts'
import { getSessionUser } from '../lib/auth.ts'
import { CommentsBox } from '../templates/components.tsx'

export const commentRoutes = new Hono()

function isHx(c: Context): boolean {
  return c.req.header('hx-request') === 'true'
}

async function currentUser(c: Context): Promise<User | null> {
  return getSessionUser(c)
}

async function boxResponse(c: Context, slug: string, user: User, error?: string): Promise<Response> {
  if (isHx(c)) {
    return c.html(String(<CommentsBox postSlug={slug} comments={await listComments(slug)} user={user} error={error} />))
  }
  const err = error ? `?err=${encodeURIComponent(error)}` : ''
  return c.redirect(`/posts/${slug}#comments${err}`, 303)
}

commentRoutes.post('/posts/:slug/comments', async (c) => {
  const slug = c.req.param('slug')
  const user = await currentUser(c)
  if (!user) return c.redirect(`/login?next=/posts/${encodeURIComponent(slug)}`, 303)

  const fd = await c.req.formData()
  const body = String(fd.get('body') ?? '').trim()
  if (body.length === 0 || body.length > 2000) {
    return boxResponse(c, slug, user, 'Comment must be between 1 and 2000 characters')
  }
  await createComment(slug, user.id, body)
  return boxResponse(c, slug, user)
})

commentRoutes.post('/comments/:id/delete', async (c) => {
  const user = await currentUser(c)
  if (!user) return c.redirect('/login', 303)

  const id = Number(c.req.param('id'))
  const comment: Comment | null = Number.isInteger(id) ? await getCommentById(id) : null
  if (!comment) {
    if (isHx(c)) return c.html('<p class="flash error">Comment not found</p>', 404)
    return c.redirect('/posts', 303)
  }
  const canDelete = user.role === 'admin' || user.id === comment.user_id
  if (!canDelete) {
    if (isHx(c)) return c.html('<p class="flash error">Not allowed to delete</p>', 403)
    return c.redirect(`/posts/${comment.post_slug}`, 303)
  }
  await deleteComment(comment.id)
  if (isHx(c)) {
    return c.html(String(<CommentsBox postSlug={comment.post_slug} comments={await listComments(comment.post_slug)} user={user} />))
  }
  return c.redirect(`/posts/${comment.post_slug}#comments`, 303)
})
