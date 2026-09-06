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
      <input type="search" name="q" value={q} placeholder="搜索文章…" aria-label="搜索" autofocus />
      <button class="btn" type="submit">
        搜索
      </button>
    </form>
  )
  const results = q ? (
    <SearchResults posts={posts} q={q} total={total} moreHref={moreHref} />
  ) : (
    <div id="search-results">
      <section>
        <p class="muted">支持对标题、摘要、系列与正文全文检索。</p>
        <TagCloud tags={tags} />
      </section>
    </div>
  )
  if (fragmentOnly) return results
  return (
    <>
      <section class="page-head">
        <h1>搜索</h1>
      </section>
      {form}
      {results}
    </>
  )
}
