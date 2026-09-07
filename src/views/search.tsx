import type { Post, TagCount } from '../lib/db.ts'
import type { Lang } from '../lib/locale.ts'
import { t } from '../lib/locale.ts'
import { SearchResults, TagCloud } from '../templates/components.tsx'

export function SearchView({
  q,
  posts,
  total,
  moreHref,
  tags,
  fragmentOnly,
  lang,
}: {
  q: string
  posts: Post[]
  total: number
  moreHref?: string
  tags: TagCount[]
  fragmentOnly?: boolean
  lang: Lang
}) {
  const form = (
    <form
      class="searchbar"
      action="/search"
      method="get"
      role="search"
      {...{ 'hx-get': '/search', 'hx-target': '#search-results', 'hx-swap': 'outerHTML', 'hx-trigger': 'input changed delay:350ms, search, submit' }}
    >
      <input type="search" name="q" value={q} placeholder={t(lang, 'search.placeholder')} aria-label={t(lang, 'search.title')} autofocus />
      <button class="btn" type="submit">
        {t(lang, 'search.submit')}
      </button>
    </form>
  )
  const results = q ? (
    <SearchResults posts={posts} q={q} total={total} moreHref={moreHref} lang={lang} />
  ) : (
    <div id="search-results">
      <section>
        <p class="muted">{t(lang, 'search.hint')}</p>
        <TagCloud tags={tags} lang={lang} />
      </section>
    </div>
  )
  if (fragmentOnly) return results
  return (
    <>
      <section class="page-head">
        <h1>{t(lang, 'search.title')}</h1>
      </section>
      {form}
      {results}
    </>
  )
}
