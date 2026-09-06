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
        <h1>嵌入式学习与边缘 AI 网关</h1>
        <p class="muted">{SITE_DESC}</p>
      </section>
      <form class="searchbar" action="/search" method="get" role="search">
        <input type="search" name="q" placeholder="搜索文章…（例如 menuconfig / recipe / TensorRT）" aria-label="搜索" />
        <button class="btn" type="submit">
          搜索
        </button>
      </form>
      <section class="cards-wrap">
        <PostList posts={posts} moreUrl={moreUrl} />
        {page > 1 ? (
          <p class="muted page-info">
            第 {page} 页（每页 {postsPerPage} 篇）
          </p>
        ) : null}
      </section>
      <section class="topics">
        <h2>标签</h2>
        <TagCloud tags={tags} />
      </section>
    </>
  )
}
