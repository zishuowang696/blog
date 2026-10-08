import type { Comment, Post, User } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { langHref, t } from '../lib/locale.ts'
import { CommentsBox, TagLinks } from '../templates/components.tsx'
import { fmtDate } from '../templates/util.ts'

function Neighbor({ label, post, lang }: { label: string; post: Post | null; lang: Lang }) {
  if (!post) return <span />
  return (
    <div class="neighbor">
      <span class="neighbor-label">{label}</span>
      <a href={langHref(lang, `/posts/${post.slug}`)}>{post.title}</a>
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
            <a href={langHref(lang, '/')}>{t(lang, 'post.all')}</a>
          </p>
          <h1>{post.title}</h1>
          <div class="post-meta">
            <time datetime={post.created_at}>{fmtDate(post.created_at)}</time>
            {post.series ? <span class="badge">{lang === 'zh' ? '系列' : 'Series'}: {post.series}</span> : null}
            <TagLinks tags={post.tags} lang={lang} />
          </div>
        </header>
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: post.content_html }} />
        <footer class="post-foot">
          <nav class="pager neighbors">
            <Neighbor label={t(lang, 'post.older')} post={older} lang={lang} />
            <Neighbor label={t(lang, 'post.newer')} post={newer} lang={lang} />
          </nav>
        </footer>
      </article>
      <CommentsBox postSlug={post.slug} comments={comments} user={user} lang={lang} />
    </>
  )
}
