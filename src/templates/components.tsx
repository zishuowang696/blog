import type { JSXNode } from 'hono/jsx'
import type { Comment, Post, PostMeta, TagCount, User } from '../lib/db.ts'
import { langHref, t, type Lang } from '../lib/locale.ts'
import { fmtDate, NEWSLETTER_ACTION, seriesHref, SITE_DESC, SITE_NAME, tagHref } from './util.ts'

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

export function PostList({ posts, lang }: { posts: Post[]; lang?: Lang }) {
  const l = lang ?? 'en'
  return (
    <div id="post-list">
      <PostGrid posts={posts} lang={l} />
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  makeHref,
  prev,
  next,
  lang,
}: {
  page: number
  totalPages: number
  makeHref: (p: number) => string
  prev?: string
  next?: string
  lang?: Lang
}) {
  const l = lang ?? 'en'
  if (totalPages <= 1) return null
  const nums: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) nums.push(i)
  }
  const items: (number | '...')[] = []
  let last = 0
  for (const n of nums) {
    if (last && n - last > 1) items.push('...')
    items.push(n)
    last = n
  }
  return (
    <nav class="pagination" aria-label="pagination">
      {prev ? (
        <a class="page-link prev" href={prev}>
          ← {t(l, 'ui.prev')}
        </a>
      ) : (
        <span class="page-link disabled">← {t(l, 'ui.prev')}</span>
      )}
      {items.map((it, i) =>
        it === '...' ? (
          <span class="page-ellipsis" key={`e${i}`}>
            …
          </span>
        ) : (
          <a
            class={'page-link' + (it === page ? ' on' : '')}
            href={makeHref(it)}
            key={it}
            aria-current={it === page ? 'page' : undefined}
          >
            {it}
          </a>
        ),
      )}
      {next ? (
        <a class="page-link next" href={next}>
          {t(l, 'ui.next')} →
        </a>
      ) : (
        <span class="page-link disabled">{t(l, 'ui.next')} →</span>
      )}
    </nav>
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

export function Sidebar({
  lang,
  latest,
  series,
}: {
  lang: Lang
  latest: PostMeta[]
  series: TagCount[]
}) {
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
          <a class="btn small ghost" href={langHref(lang, '/feed.xml')}>
            {lang === 'zh' ? '订阅' : 'RSS'}
          </a>
        </div>
      </div>
      {series.length > 0 ? (
        <div class="side-card">
          <h3 class="side-title">{t(lang, 'nav.series')}</h3>
          <ul class="latest-list">
            {series.slice(0, 8).map((s) => (
              <li key={s.name}>
                <a href={langHref(lang, seriesHref(s.name))}>
                  {s.name}
                  <span class="d">{t(lang, 'series.count', { n: s.count })}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
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
    </aside>
  )
}

export function BottomSection({ tags, lang }: { tags: TagCount[]; lang: Lang }) {
  return (
    <section class="below">
      <div class="subscribe-band">
        <div class="sub-text">
          <h2>{lang === 'zh' ? '订阅更新' : 'Subscribe'}</h2>
          <p>
            {lang === 'zh'
              ? '留邮箱，有新文章自动发到你的邮箱；也可以订阅 RSS。'
              : 'Get new posts by email — or subscribe via RSS.'}
          </p>
        </div>
        <form class="subscribe-form" action={NEWSLETTER_ACTION} method="post" target="_blank">
          <input type="email" name="email" required placeholder={lang === 'zh' ? '你的邮箱' : 'your email'} aria-label="email" />
          <button class="btn" type="submit">
            {lang === 'zh' ? '订阅' : 'Subscribe'}
          </button>
        </form>
      </div>
      <div class="cta-band">
        <div class="cta-text">
          <h2>{lang === 'zh' ? '需要定制？' : 'Need something built?'}</h2>
          <p>
            {lang === 'zh'
              ? '嵌入式 / 边缘 AI / AI Agent 的定制、开发与咨询。'
              : 'Custom development and consulting for embedded, edge AI and agents.'}
          </p>
        </div>
        <a class="btn" href={langHref(lang, '/about')}>
          {lang === 'zh' ? '了解与联系 →' : 'Learn more →'}
        </a>
      </div>
      {tags.length > 0 ? (
        <div class="tags-band">
          <h2 class="band-title">{lang === 'zh' ? '标签' : 'Tags'}</h2>
          <TagCloud tags={tags} lang={lang} />
        </div>
      ) : null}
    </section>
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
