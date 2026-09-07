import type { Post, TagCount } from '../lib/db.ts'
import { PostList, TagCloud } from '../templates/components.tsx'
import { SITE_DESC } from '../templates/util.ts'

export function HomeView({
  posts,
  moreUrl,
  page,
  tags,
  postsPerPage,
}: {
  posts: Post[]
  moreUrl?: string
  page: number
  tags: TagCount[]
  postsPerPage: number
}) {
  return (
    <>
      <section class="hero">
        <h1>Embedded Learning & Edge AI Gateway</h1>
        <p class="muted">{SITE_DESC}</p>
      </section>
      <form class="searchbar" action="/search" method="get" role="search">
        <input type="search" name="q" placeholder="Search posts… (e.g. menuconfig / recipe / TensorRT)" aria-label="Search" />
        <button class="btn" type="submit">
          Search
        </button>
      </form>
      <section class="cards-wrap">
        <PostList posts={posts} moreUrl={moreUrl} />
        {page > 1 ? (
          <p class="muted page-info">
            Page {page} ({postsPerPage} posts per page)
          </p>
        ) : null}
      </section>
      <section class="topics">
        <h2>Tags</h2>
        <TagCloud tags={tags} />
      </section>
    </>
  )
}
