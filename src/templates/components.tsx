import type { JSXNode } from 'hono/jsx'
import type { Comment, Post, TagCount, User } from '../lib/db.ts'
import { fmtDate, tagHref } from './util.ts'

export function TagLinks({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span class="tag-list" />
  return (
    <span class="tag-list">
      {tags.map((t) => (
        <a class="tag" href={tagHref(t)}>
          {t}
        </a>
      ))}
    </span>
  )
}

function PostCard({ post }: { post: Post }) {
  return (
    <article class="card post-card">
      <header class="card-head">
        <time datetime={post.created_at}>{fmtDate(post.created_at)}</time>
        {post.series ? (
          <span class="badge" title={`Series: ${post.series}`}>
            {post.series}
          </span>
        ) : null}
      </header>
      <h2 class="card-title">
        <a href={`/posts/${post.slug}`}>{post.title}</a>
      </h2>
      <p class="card-summary">{post.summary}</p>
      <footer class="card-meta">
        <TagLinks tags={post.tags} />
      </footer>
    </article>
  )
}

export function PostGrid({ posts }: { posts: Post[] }) {
  return <>{posts.map((p) => <PostCard key={p.id} post={p} />)}</>
}

const loadMoreHx = (url: string) => ({
  'hx-get': url,
  'hx-target': '#post-list',
  'hx-swap': 'beforeend',
  'hx-on::after-request': "this.closest('.loadmore').remove()",
})

function LoadMore({ url }: { url: string }) {
  return (
    <div class="loadmore">
      <a class="btn" href={url} {...loadMoreHx(url)}>
        Load more
      </a>
    </div>
  )
}

export function PostList({ posts, moreUrl }: { posts: Post[]; moreUrl?: string }) {
  return (
    <div id="post-list">
      <PostGrid posts={posts} />
      {moreUrl ? <LoadMore url={moreUrl} /> : null}
    </div>
  )
}

export function ListChunk({ posts, moreUrl }: { posts: Post[]; moreUrl?: string }) {
  return (
    <>
      <PostGrid posts={posts} />
      {moreUrl ? <LoadMore url={moreUrl} /> : null}
    </>
  )
}

export function TagCloud({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) return <p class="empty">No tags yet</p>
  return (
    <p class="tag-cloud">
      {tags.map((t) => (
        <a class="tag chip" href={tagHref(t.name)}>
          {t.name}
          <span class="count">{t.count}</span>
        </a>
      ))}
    </p>
  )
}

export function CommentBody({ body }: { body: string }) {
  return <div class="comment-body">{body}</div>
}

function CommentItem({ comment, user }: { comment: Comment; user: User | null }) {
  const canDelete = user !== null && (user.role === 'admin' || user.id === comment.user_id)
  const deleteHx = {
    'hx-post': `/comments/${comment.id}/delete`,
    'hx-target': '#comments-box',
    'hx-swap': 'outerHTML',
    'hx-confirm': 'Delete this comment?',
  }
  return (
    <li class="comment" id={`comment-${comment.id}`}>
      <div class="comment-head">
        <strong class="comment-name">{comment.display_name}</strong>
        <time datetime={comment.created_at}>{fmtDate(comment.created_at)}</time>
        {canDelete ? (
          <form class="inline" action={`/comments/${comment.id}/delete`} method="post" {...deleteHx}>
            <button class="linkish danger" type="submit">
              Delete
            </button>
          </form>
        ) : null}
      </div>
      <CommentBody body={comment.body} />
    </li>
  )
}

export function CommentsBox({
  postSlug,
  comments,
  user,
  error,
}: {
  postSlug: string
  comments: Comment[]
  user: User | null
  error?: string
}) {
  const commentHx = {
    'hx-post': `/posts/${postSlug}/comments`,
    'hx-target': '#comments-box',
    'hx-swap': 'outerHTML',
  }
  return (
    <section class="comments" id="comments-box">
      <h2 class="section-title">
        Comments <span class="count">{comments.length}</span>
      </h2>
      {error ? <p class="flash error">{error}</p> : null}
      {comments.length === 0 ? (
        <p class="empty">No comments yet — be the first!</p>
      ) : (
        <ul class="comments-list">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} user={user} />
          ))}
        </ul>
      )}
      {user ? (
        <form class="comment-form" action={`/posts/${postSlug}/comments`} method="post" {...commentHx}>
          <label class="visually-hidden" htmlFor="comment-body">
            Comment
          </label>
          <textarea id="comment-body" name="body" rows={4} minlength={1} maxlength={2000} placeholder="Share your thoughts (shown as plain text)" required>
            {''}
          </textarea>
          <div class="form-actions">
            <span class="muted">Comment as {user.display_name}</span>
            <button class="btn" type="submit">
              Post comment
            </button>
          </div>
        </form>
      ) : (
        <p class="auth-hint">
          <a href={`/login?next=/posts/${postSlug}`}>Log in</a> to comment
        </p>
      )}
    </section>
  )
}

export function SearchResults({
  posts,
  q,
  total,
  moreHref,
  placeholder,
}: {
  posts: Post[]
  q: string
  total: number
  moreHref?: string
  placeholder?: JSXNode
}) {
  const body =
    posts.length === 0 ? (
      <p class="empty">No posts match your search.</p>
    ) : (
      <PostGrid posts={posts} />
    )
  return (
    <div id="search-results">
      <section>
        {q ? (
          <>
            <p class="muted">
              {total} results for “{q}”
            </p>
            {body}
            {moreHref ? (
              <p class="muted more-link">
                <a class="btn ghost" href={moreHref}>
                  {total - posts.length} more →
                </a>
              </p>
            ) : null}
          </>
        ) : (
          placeholder ?? <p class="empty">Type a keyword to start searching</p>
        )}
      </section>
    </div>
  )
}
