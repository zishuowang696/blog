import type { Comment, Post, User } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
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
  lang,
}: {
  post: Post
  comments: Comment[]
  user: User | null
  older: Post | null
  newer: Post | null
  lang: Lang
}) {
  return (
    <>
      <article class="post">
        <header class="post-head">
          <p class="crumbs">
            <a href="/">{t(lang, 'post.all')}</a>
          </p>
          <h1>{post.title}</h1>
          <div class="post-meta">
            <time datetime={post.created_at}>{fmtDate(post.created_at)}</time>
            {post.series ? <span class="badge">{lang === 'zh' ? '系列' : 'Series'}: {post.series}</span> : null}
            <TagLinks tags={post.tags} />
          </div>
        </header>
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: post.content_html }} />
        <footer class="post-foot">
          <nav class="pager neighbors">
            <Neighbor label={t(lang, 'post.older')} post={older} />
            <Neighbor label={t(lang, 'post.newer')} post={newer} />
          </nav>
        </footer>
      </article>
      <CommentsBox postSlug={post.slug} comments={comments} user={user} lang={lang} />
    </>
  )
}
