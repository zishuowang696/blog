import { describe, expect, test } from 'bun:test'
import type { Post } from '../src/lib/db.ts'
import { PostGrid, TagLinks } from '../src/templates/components.tsx'
import { StatsView } from '../src/views/admin.tsx'

const post: Post = {
  id: 1,
  slug: 'demo-post',
  title: '标题 <script>alert(1)</script>',
  summary: '摘要 & 引号"',
  content_html: '',
  source_md: '',
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
    const html = String(<TagLinks tags={['编译 笔记', 'x&y']} lang="zh" />)
    expect(html).toContain('/tags/%E7%BC%96%E8%AF%91%20%E7%AC%94%E8%AE%B0')
    expect(html).toContain('/tags/x%26y')
  })

  test('访问统计视图渲染（含 IP 来源）', () => {
    const html = String(
      <StatsView
        overview={{ pv: 3, uv: 2, todayPv: 3, todayUv: 2, weekPv: 3, weekUv: 2 }}
        daily={[{ day: '2026-10-12', views: 3, visitors: 2 }]}
        topPaths={[{ path: '/', views: 3, visitors: 2 }]}
        referers={[{ referer: '', views: 3 }]}
        bySource={[{ category: '外部链接', pv: 1, uv: 1 }]}
        byIp={[{ ip: '8.8.8.8', views: 2, first: '2026-10-12T00:00', last: '2026-10-12T01:00', referers: '(direct)', geo: 'United States / California' }]}
        bots={[{ bot: 'Googlebot', pv: 5, uv: 1, last: '2026-10-12T01:00', ips: '66.249.66.1' }]}
        recent={[{ path: '/', referer: '', created_at: '2026-10-12T01:00' }]}
      />,
    )
    expect(html).toContain('8.8.8.8')
    expect(html).toContain('United States / California')
    expect(html).toContain('真实外部读者')
    expect(html).toContain('Googlebot')
  })
})
