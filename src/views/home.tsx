import type { Post, PostMeta, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { langHref, t } from '../lib/locale.ts'
import { PostList, Sidebar } from '../templates/components.tsx'
import { SITE_DESC } from '../templates/util.ts'

export function HomeView({
  posts,
  moreUrl,
  page,
  tags,
  latest,
  postsPerPage,
  lang,
}: {
  posts: Post[]
  moreUrl?: string
  page: number
  tags: TagCount[]
  latest: PostMeta[]
  postsPerPage: number
  lang: Lang
}) {
  return (
    <>
      <section class="hero">
        <h1>{t(lang, 'home.hero')}</h1>
        <p>{SITE_DESC}</p>
        <div class="hero-actions">
          <a class="btn" href={langHref(lang, '/tags')}>
            {t(lang, 'nav.tags')}
          </a>
          <a class="btn ghost" href={langHref(lang, '/about')}>
            {t(lang, 'nav.about')}
          </a>
        </div>
      </section>
      <div class="content-grid">
        <div>
          <form class="searchbar" action={langHref(lang, '/search')} method="get" role="search">
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
        </div>
        <Sidebar lang={lang} latest={latest} tags={tags} />
      </div>
    </>
  )
}
