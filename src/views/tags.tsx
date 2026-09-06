import type { Post, TagCount } from '../lib/db.ts'
import { PostList, TagCloud } from '../templates/components.tsx'

export function TagsIndexView({ tags }: { tags: TagCount[] }) {
  return (
    <>
      <section class="page-head">
        <h1>标签</h1>
        <p class="muted">按主题归档：OpenWrt / Yocto / Jetson / AI 网关…</p>
      </section>
      <section>
        <TagCloud tags={tags} />
      </section>
    </>
  )
}

export function TagPostsView({
  tag,
  posts,
  moreUrl,
  total,
}: {
  tag: string
  posts: Post[]
  moreUrl?: string
  total: number
}) {
  return (
    <>
      <section class="page-head">
        <h1>
          <span class="tag">{tag}</span>
        </h1>
        <p class="muted">共 {total} 篇</p>
      </section>
      <section>
        <PostList posts={posts} moreUrl={moreUrl} />
      </section>
    </>
  )
}
