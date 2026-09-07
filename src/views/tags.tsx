import type { Post, TagCount } from '../lib/db.ts'
import { PostList, TagCloud } from '../templates/components.tsx'

export function TagsIndexView({ tags }: { tags: TagCount[] }) {
  return (
    <>
      <section class="page-head">
        <h1>Tags</h1>
        <p class="muted">Grouped by topic: OpenWrt / Yocto / Jetson / AI gateway…</p>
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
        <p class="muted">{total} posts</p>
      </section>
      <section>
        <PostList posts={posts} moreUrl={moreUrl} />
      </section>
    </>
  )
}
