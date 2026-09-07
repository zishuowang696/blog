import type { Post, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
import { PostList, TagCloud } from '../templates/components.tsx'

export function TagsIndexView({ tags, lang }: { tags: TagCount[]; lang: Lang }) {
  return (
    <>
      <section class="page-head">
        <h1>{t(lang, 'tags.title')}</h1>
        <p class="muted">{t(lang, 'tags.muted')}</p>
      </section>
      <section>
        <TagCloud tags={tags} lang={lang} />
      </section>
    </>
  )
}

export function TagPostsView({
  tag,
  posts,
  moreUrl,
  total,
  lang,
}: {
  tag: string
  posts: Post[]
  moreUrl?: string
  total: number
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
      <section>
        <PostList posts={posts} moreUrl={moreUrl} lang={lang} />
      </section>
    </>
  )
}
