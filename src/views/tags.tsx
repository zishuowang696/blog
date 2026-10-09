import type { Post, PostMeta, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
import { PostList, Sidebar, TagCloud } from '../templates/components.tsx'

export function TagsIndexView({ tags, latest, lang }: { tags: TagCount[]; latest: PostMeta[]; lang: Lang }) {
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
        <Sidebar lang={lang} latest={latest} tags={tags} />
      </div>
    </>
  )
}

export function TagPostsView({
  tag,
  posts,
  moreUrl,
  total,
  latest,
  tags,
  lang,
}: {
  tag: string
  posts: Post[]
  moreUrl?: string
  total: number
  latest: PostMeta[]
  tags: TagCount[]
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
          <PostList posts={posts} moreUrl={moreUrl} lang={lang} />
        </section>
        <Sidebar lang={lang} latest={latest} tags={tags} />
      </div>
    </>
  )
}
