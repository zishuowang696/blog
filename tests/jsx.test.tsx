import { describe, expect, test } from 'bun:test'
import type { Post } from '../src/lib/db.ts'
import { PostGrid, TagLinks } from '../src/templates/components.tsx'

const post: Post = {
  id: 1,
  slug: 'demo-post',
  title: '标题 <script>alert(1)</script>',
  summary: '摘要 & 引号"',
  content_html: '',
  series: 'AI 网关实战',
  published: true,
  created_at: '2026-08-01',
  updated_at: '2026-08-01',
  tags: ['openwrt', '编译'],
}

describe('components JSX 渲染', () => {
  test('字符串内容自动转义', () => {
    const html = String(<PostGrid posts={[post]} />)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('/posts/demo-post')
  })

  test('标签链接做 URL 编码', () => {
    const html = String(<TagLinks tags={['编译 笔记', 'x&y']} />)
    expect(html).toContain('/tags/%E7%BC%96%E8%AF%91%20%E7%AC%94%E8%AE%B0')
    expect(html).toContain('/tags/x%26y')
  })
})
