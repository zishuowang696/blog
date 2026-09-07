import type { Comment, Post, User } from '../lib/db.ts'
import { CommentsBox, TagLinks } from '../templates/components.tsx'
import { fmtDate } from '../templates/util.ts'

function Neighbor({ label, post }: { label: string; post: Post | null }) {
  if (!post) return <span />
  return (
    <div class="neighbor">
      <span class="neighbor-label">{label}</span>
      <a href={`/posts/${post.slug}`}>{post.title}</a>
    </div>
  )
}

export function PostView({
  post,
  comments,
  user,
  older,
  newer,
}: {
  post: Post
  comments: Comment[]
  user: User | null
  older: Post | null
  newer: Post | null
}) {
  return (
    <>
      <article class="post">
        <header class="post-head">
          <p class="crumbs">
            <a href="/">← All posts</a>
          </p>
          <h1>{post.title}</h1>
          <div class="post-meta">
            <time datetime={post.created_at}>{fmtDate(post.created_at)}</time>
            {post.series ? <span class="badge">Series: {post.series}</span> : null}
            <TagLinks tags={post.tags} />
          </div>
        </header>
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: post.content_html }} />
        <footer class="post-foot">
          <nav class="pager neighbors">
            <Neighbor label="Older" post={older} />
            <Neighbor label="Newer" post={newer} />
          </nav>
        </footer>
      </article>
      <CommentsBox postSlug={post.slug} comments={comments} user={user} />
    </>
  )
}
