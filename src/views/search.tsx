import type { Post, TagCount } from '../lib/db.ts'
import { SearchResults } from '../templates/components.tsx'
import { TagCloud } from '../templates/components.tsx'

export function SearchView({
  q,
  posts,
  total,
  moreHref,
  tags,
  fragmentOnly,
}: {
  q: string
  posts: Post[]
  total: number
  moreHref?: string
  tags: TagCount[]
  fragmentOnly?: boolean
}) {
  const form = (
    <form
      class="searchbar"
      action="/search"
      method="get"
      role="search"
      {...{ 'hx-get': '/search', 'hx-target': '#search-results', 'hx-swap': 'outerHTML', 'hx-trigger': 'input changed delay:350ms, search, submit' }}
    >
      <input type="search" name="q" value={q} placeholder="Search posts…" aria-label="Search" autofocus />
      <button class="btn" type="submit">
        Search
      </button>
    </form>
  )
  const results = q ? (
    <SearchResults posts={posts} q={q} total={total} moreHref={moreHref} />
  ) : (
    <div id="search-results">
      <section>
        <p class="muted">Full-text search across titles, summaries, series and content.</p>
        <TagCloud tags={tags} />
      </section>
    </div>
  )
  if (fragmentOnly) return results
  return (
    <>
      <section class="page-head">
        <h1>Search</h1>
      </section>
      {form}
      {results}
    </>
  )
}
