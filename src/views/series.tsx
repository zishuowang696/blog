import type { Post, PostMeta, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { langHref, t } from '../lib/locale.ts'
import { BottomSection, Pagination, PostList, Sidebar } from '../templates/components.tsx'
import { seriesHref } from '../templates/util.ts'

export function SeriesIndexView({
  series,
  latest,
  tags,
  lang,
}: {
  series: TagCount[]
  latest: PostMeta[]
  tags: TagCount[]
  lang: Lang
}) {
  return (
    <>
      <section class="page-head">
        <h1>{t(lang, 'series.title')}</h1>
        <p class="muted">{t(lang, 'series.muted')}</p>
      </section>
      <div class="content-grid">
        <section class="series-list">
          {series.length === 0 ? (
            <p class="empty">{lang === 'zh' ? '暂无系列' : 'No series yet'}</p>
          ) : (
            series.map((s) => (
              <a class="series-item" href={langHref(lang, seriesHref(s.name))}>
                <span class="series-name">{s.name}</span>
                <span class="series-count">{t(lang, 'series.count', { n: s.count })}</span>
              </a>
            ))
          )}
        </section>
        <Sidebar lang={lang} latest={latest} series={series} />
      </div>
      <BottomSection tags={tags} lang={lang} />
    </>
  )
}

export function SeriesPostsView({
  name,
  posts,
  page,
  totalPages,
  total,
  latest,
  tags,
  allSeries,
  makeHref,
  lang,
}: {
  name: string
  posts: Post[]
  page: number
  totalPages: number
  total: number
  latest: PostMeta[]
  tags: TagCount[]
  allSeries: TagCount[]
  makeHref: (p: number) => string
  lang: Lang
}) {
  return (
    <>
      <section class="page-head">
        <p class="crumbs">
          <a href={langHref(lang, '/series')}>{t(lang, 'series.title')}</a>
        </p>
        <h1>{name}</h1>
        <p class="muted">{t(lang, 'series.count', { n: total })}</p>
      </section>
      <div class="content-grid">
        <section>
          <PostList posts={posts} lang={lang} />
          <Pagination
            page={page}
            totalPages={totalPages}
            makeHref={makeHref}
            prev={page > 1 ? makeHref(page - 1) : undefined}
            next={page < totalPages ? makeHref(page + 1) : undefined}
            lang={lang}
          />
        </section>
        <Sidebar lang={lang} latest={latest} series={allSeries} />
      </div>
      <BottomSection tags={tags} lang={lang} />
    </>
  )
}
