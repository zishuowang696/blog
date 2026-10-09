import type { JSXNode } from 'hono/jsx'
import type { Comment, Post, PostMeta, TagCount, User } from '../lib/db.ts'
import { langHref, t, type Lang } from '../lib/locale.ts'
import { fmtDate, SITE_DESC, SITE_NAME, tagHref } from './util.ts'

function seriesLabel(lang: Lang): string {
  return lang === 'zh' ? '系列' : 'Series'
}

export function TagLinks({ tags, lang }: { tags: string[]; lang: Lang }) {
  if (tags.length === 0) return <span class="tag-list" />
  return (
    <span class="tag-list">
      {tags.map((tg) => (
        <a class="tag" href={langHref(lang, tagHref(tg))}>
          {tg}
        </a>
      ))}
    </span>
  )
}

function PostCard({ post, lang }: { post: Post; lang: Lang }) {
  return (
    <article class="card post-card">
      <header class="card-head">
        <time datetime={post.created_at}>{fmtDate(post.created_at)}</time>
        {post.series ? (
          <span class="badge" title={`${seriesLabel(lang)}: ${post.series}`}>
            {post.series}
          </span>
        ) : null}
      </header>
      <h2 class="card-title">
        <a href={langHref(lang, `/posts/${post.slug}`)}>{post.title}</a>
      </h2>
      <p class="card-summary">{post.summary}</p>
      <footer class="card-meta">
        <TagLinks tags={post.tags} lang={lang} />
      </footer>
    </article>
  )
}

export function PostGrid({ posts, lang }: { posts: Post[]; lang?: Lang }) {
  const l = lang ?? 'en'
  return <>{posts.map((p) => <PostCard key={p.id} post={p} lang={l} />)}</>
}

const loadMoreHx = (url: string) => ({
  'hx-get': url,
  'hx-target': '#post-list',
  'hx-swap': 'beforeend',
  'hx-trigger': 'revealed',
  'hx-on::after-request': "this.closest('.loadmore').remove()",
})

function LoadMore({ url, lang }: { url: string; lang: Lang }) {
  return (
    <div class="loadmore" {...loadMoreHx(url)}>
      <a class="btn" href={url}>
        {t(lang, 'list.more')}
      </a>
      <span class="spinner" aria-hidden="true" />
    </div>
  )
}

export function PostList({ posts, moreUrl, lang }: { posts: Post[]; moreUrl?: string; lang?: Lang }) {
  const l = lang ?? 'en'
  return (
    <div id="post-list">
      <PostGrid posts={posts} lang={l} />
      {moreUrl ? <LoadMore url={moreUrl} lang={l} /> : null}
    </div>
  )
}

export function ListChunk({ posts, moreUrl, lang }: { posts: Post[]; moreUrl?: string; lang?: Lang }) {
  const l = lang ?? 'en'
  return (
    <>
      <PostGrid posts={posts} lang={l} />
      {moreUrl ? <LoadMore url={moreUrl} lang={l} /> : null}
    </>
  )
}

export function TagCloud({ tags, lang }: { tags: TagCount[]; lang?: Lang }) {
  const l = lang ?? 'en'
  if (tags.length === 0) return <p class="empty">{t(l, 't.empty')}</p>
  return (
    <p class="tag-cloud">
      {tags.map((tg) => (
        <a class="tag chip" href={langHref(l, tagHref(tg.name))}>
          {tg.name}
          <span class="count">{tg.count}</span>
        </a>
      ))}
    </p>
  )
}

export function Sidebar({ lang, latest, tags }: { lang: Lang; latest: PostMeta[]; tags: TagCount[] }) {
  return (
    <aside class="sidebar">
      <div class="side-card">
        <div class="side-brand">{SITE_NAME}</div>
        <p>{SITE_DESC}</p>
        <div class="side-links">
          <a class="btn small ghost" href={langHref(lang, '/about')}>
            {t(lang, 'nav.about')}
          </a>
          <a class="btn small ghost" href={langHref(lang, '/tags')}>
            {t(lang, 'nav.tags')}
          </a>
        </div>
      </div>
      {latest.length > 0 ? (
        <div class="side-card">
          <h3 class="side-title">{lang === 'zh' ? '最新文章' : 'Latest'}</h3>
          <ul class="latest-list">
            {latest.map((p) => (
              <li key={p.slug}>
                <a href={langHref(lang, `/posts/${p.slug}`)}>
                  {p.title}
                  <span class="d">{fmtDate(p.date)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {tags.length > 0 ? (
        <div class="side-card">
          <h3 class="side-title">{lang === 'zh' ? '标签' : 'Tags'}</h3>
          <TagCloud tags={tags} lang={lang} />
        </div>
      ) : null}
    </aside>
  )
}

export function CommentBody({ body }: { body: string }) {
  return <div class="comment-body">{body}</div>
}

function CommentItem({ comment, user, lang }: { comment: Comment; user: User | null; lang: Lang }) {
  const canDelete = user !== null && (user.role === 'admin' || user.id === comment.user_id)
  const deleteHx = {
    'hx-post': langHref(lang, `/comments/${comment.id}/delete`),
    'hx-target': '#comments-box',
    'hx-swap': 'outerHTML',
    'hx-confirm': t(lang, 'c.confirm'),
  }
  return (
    <li class="comment" id={`comment-${comment.id}`}>
      <div class="comment-head">
        <strong class="comment-name">{comment.display_name}</strong>
        <time datetime={comment.created_at}>{fmtDate(comment.created_at)}</time>
        {canDelete ? (
          <form class="inline" action={langHref(lang, `/comments/${comment.id}/delete`)} method="post" {...deleteHx}>
            <button class="linkish danger" type="submit">
              {t(lang, 'c.delete')}
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
  lang,
}: {
  postSlug: string
  comments: Comment[]
  user: User | null
  error?: string
  lang?: Lang
}) {
  const l = lang ?? 'en'
  const commentHx = {
    'hx-post': langHref(l, `/posts/${postSlug}/comments`),
    'hx-target': '#comments-box',
    'hx-swap': 'outerHTML',
  }
  return (
    <section class="comments" id="comments-box">
      <h2 class="section-title">
        {t(l, 'c.title')} <span class="count">{comments.length}</span>
      </h2>
      {error ? <p class="flash error">{error}</p> : null}
      {comments.length === 0 ? (
        <p class="empty">{t(l, 'c.empty')}</p>
      ) : (
        <ul class="comments-list">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} user={user} lang={l} />
          ))}
        </ul>
      )}
      {user ? (
        <form class="comment-form" action={langHref(l, `/posts/${postSlug}/comments`)} method="post" {...commentHx}>
          <label class="visually-hidden" htmlFor="comment-body">
            {t(l, 'c.title')}
          </label>
          <textarea id="comment-body" name="body" rows={4} minlength={1} maxlength={2000} placeholder={t(l, 'c.placeholder')} required>
            {''}
          </textarea>
          <div class="form-actions">
            <span class="muted">{t(l, 'c.as', { name: user.display_name })}</span>
            <button class="btn" type="submit">
              {t(l, 'c.submit')}
            </button>
          </div>
        </form>
      ) : (
        <p class="auth-hint">
          <a href={langHref(l, `/login?next=${encodeURIComponent(langHref(l, `/posts/${postSlug}`))}`)}>{t(l, 'acct.login')}</a> {t(l, 'c.login_hint')}
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
  lang,
}: {
  posts: Post[]
  q: string
  total: number
  moreHref?: string
  placeholder?: JSXNode
  lang?: Lang
}) {
  const l = lang ?? 'en'
  const body =
    posts.length === 0 ? (
      <p class="empty">{t(l, 's.none')}</p>
    ) : (
      <PostGrid posts={posts} lang={l} />
    )
  return (
    <div id="search-results">
      <section>
        {q ? (
          <>
            <p class="muted">
              {t(l, 's.results', { q, n: total })}
            </p>
            {body}
            {moreHref ? (
              <p class="muted more-link">
                <a class="btn ghost" href={moreHref}>
                  {t(l, 's.more', { n: total - posts.length })} →
                </a>
              </p>
            ) : null}
          </>
        ) : (
          placeholder ?? <p class="empty">{t(l, 's.type_hint')}</p>
        )}
      </section>
    </div>
  )
}
