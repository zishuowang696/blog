import type { Post, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
import { PostList, TagCloud } from '../templates/components.tsx'
import { SITE_DESC } from '../templates/util.ts'

export function HomeView({
  posts,
  moreUrl,
  page,
  tags,
  postsPerPage,
  lang,
}: {
  posts: Post[]
  moreUrl?: string
  page: number
  tags: TagCount[]
  postsPerPage: number
  lang: Lang
}) {
  return (
    <>
      <section class="hero">
        <h1>{t(lang, 'home.hero')}</h1>
        <p class="muted">{SITE_DESC}</p>
      </section>
      <form class="searchbar" action="/search" method="get" role="search">
        <input type="search" name="q" placeholder={t(lang, 'search.placeholder')} aria-label={t(lang, 'search.title')} />
        <button class="btn" type="submit">
          {t(lang, 'search.submit')}
        </button>
      </form>
      <section class="cards-wrap">
        <PostList posts={posts} moreUrl={moreUrl} lang={lang} />
        {page > 1 ? (
          <p class="muted page-info">
            {lang === 'zh' ? `第 ${page} 页（每页 ${postsPerPage} 篇）` : `Page ${page} (${postsPerPage} posts per page)`}
          </p>
        ) : null}
      </section>
      <section class="topics">
        <h2>{t(lang, 'nav.tags')}</h2>
        <TagCloud tags={tags} lang={lang} />
      </section>
    </>
  )
}
