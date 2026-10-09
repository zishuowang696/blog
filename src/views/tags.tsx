import type { Post, PostMeta, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
import { Pagination, PostList, Sidebar, TagCloud } from '../templates/components.tsx'

export function TagsIndexView({
  tags,
  latest,
  series,
  lang,
}: {
  tags: TagCount[]
  latest: PostMeta[]
  series: TagCount[]
  lang: Lang
}) {
  return (
    <>
      <section class="page-head">
        <h1>{t(lang, 'tags.title')}</h1>
        <p class="muted">{t(lang, 'tags.muted')}</p>
      </section>
      <div class="content-grid">
        <section>
          <TagCloud tags={tags} lang={lang} />
        </section>
        <Sidebar lang={lang} latest={latest} tags={tags} series={series} />
      </div>
    </>
  )
}

export function TagPostsView({
  tag,
  posts,
  page,
  totalPages,
  total,
  latest,
  tags,
  series,
  makeHref,
  lang,
}: {
  tag: string
  posts: Post[]
  page: number
  totalPages: number
  total: number
  latest: PostMeta[]
  tags: TagCount[]
  series: TagCount[]
  makeHref: (p: number) => string
  lang: Lang
}) {
  return (
    <>
      <section class="page-head">
        <h1>
          <span class="tag">{tag}</span>
        </h1>
        <p class="muted">{t(lang, 'tags.count', { n: total })}</p>
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
        <Sidebar lang={lang} latest={latest} tags={tags} series={series} />
      </div>
    </>
  )
}
