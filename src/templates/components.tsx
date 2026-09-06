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
          <span class="badge" title={`系列：${post.series}`}>
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

const loadMoreHx = (url: string) => ({ 'hx-get': url, 'hx-target': '#post-list', 'hx-swap': 'outerHTML' })

export function PostList({ posts, moreUrl }: { posts: Post[]; moreUrl?: string }) {
  return (
    <div id="post-list">
      <PostGrid posts={posts} />
      {moreUrl ? (
        <div class="loadmore">
          <a class="btn" href={moreUrl} {...loadMoreHx(moreUrl)}>
            加载更多
          </a>
        </div>
      ) : null}
    </div>
  )
}

export function TagCloud({ tags }: { tags: TagCount[] }) {
  if (tags.length === 0) return <p class="empty">暂无标签</p>
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
    'hx-confirm': '确认删除这条评论？',
  }
  return (
    <li class="comment" id={`comment-${comment.id}`}>
      <div class="comment-head">
        <strong class="comment-name">{comment.display_name}</strong>
        <time datetime={comment.created_at}>{fmtDate(comment.created_at)}</time>
        {canDelete ? (
          <form class="inline" action={`/comments/${comment.id}/delete`} method="post" {...deleteHx}>
            <button class="linkish danger" type="submit">
              删除
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
        评论 <span class="count">{comments.length}</span>
      </h2>
      {error ? <p class="flash error">{error}</p> : null}
      {comments.length === 0 ? (
        <p class="empty">还没有评论，来抢沙发～</p>
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
            评论内容
          </label>
          <textarea id="comment-body" name="body" rows={4} minlength={1} maxlength={2000} placeholder="分享你的看法（以纯文本展示）" required>
            {''}
          </textarea>
          <div class="form-actions">
            <span class="muted">以 {user.display_name} 的身份发表</span>
            <button class="btn" type="submit">
              发表评论
            </button>
          </div>
        </form>
      ) : (
        <p class="auth-hint">
          <a href={`/login?next=/posts/${postSlug}`}>登录</a>
          后即可参与评论
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
      <p class="empty">未找到与关键词匹配的文章</p>
    ) : (
      <PostGrid posts={posts} />
    )
  return (
    <div id="search-results">
      <section>
        {q ? (
          <>
            <p class="muted">
              “{q}” 共 {total} 条结果
            </p>
            {body}
            {moreHref ? (
              <p class="muted more-link">
                <a class="btn ghost" href={moreHref}>
                  还有 {total - posts.length} 篇，下一页 →
                </a>
              </p>
            ) : null}
          </>
        ) : (
          placeholder ?? <p class="empty">输入关键词开始搜索</p>
        )}
      </section>
    </div>
  )
}
