import type { Post, PostMeta, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { langHref, t } from '../lib/locale.ts'
import { BottomSection, Pagination, PostList, Sidebar } from '../templates/components.tsx'
import { SITE_DESC } from '../templates/util.ts'

export function HomeView({
  posts,
  page,
  totalPages,
  tags,
  latest,
  series,
  makeHref,
  lang,
}: {
  posts: Post[]
  page: number
  totalPages: number
  tags: TagCount[]
  latest: PostMeta[]
  series: TagCount[]
  makeHref: (p: number) => string
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
          <a class="btn ghost" href={langHref(lang, '/feed.xml')}>
            {lang === 'zh' ? '订阅（RSS）' : 'Subscribe (RSS)'}
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
            <PostList posts={posts} lang={lang} />
          </section>
          <Pagination
            page={page}
            totalPages={totalPages}
            makeHref={makeHref}
            prev={page > 1 ? makeHref(page - 1) : undefined}
            next={page < totalPages ? makeHref(page + 1) : undefined}
            lang={lang}
          />
        </div>
        <Sidebar lang={lang} latest={latest} series={series} />
      </div>
      <BottomSection tags={tags} lang={lang} />
    </>
  )
}
