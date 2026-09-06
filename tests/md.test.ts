import { describe, expect, test } from 'bun:test'
import { parseFrontmatter, renderMarkdown, extractPlainText } from '../src/lib/md.ts'

describe('parseFrontmatter', () => {
  test('解析完整 frontmatter', () => {
    const { data, body } = parseFrontmatter(`---
title: "Hello"
date: 2026-08-01
tags: [openwrt, yocto]
summary: short
published: true
---
正文第一段`)
    expect(data.title).toBe('Hello')
    expect(data.date).toBe('2026-08-01')
    expect(data.tags).toEqual(['openwrt', 'yocto'])
    expect(data.summary).toBe('short')
    expect(data.published).toBe(true)
    expect(body).toBe('正文第一段')
  })

  test('无 frontmatter 时整篇作为正文', () => {
    const { data, body } = parseFrontmatter('只有正文\n第二行')
    expect(data).toEqual({})
    expect(body).toBe('只有正文\n第二行')
  })
})

describe('renderMarkdown', () => {
  test('标题与段落', () => {
    const html = renderMarkdown('# 标题\n\n第一段\n第二行')
    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('<p>第一段 第二行</p>')
  })

  test('fenced 代码块带语言并转义', () => {
    const html = renderMarkdown('```bash\necho "a<b"\n```')
    expect(html).toContain('<pre><code class="language-bash">')
    expect(html).toContain('a&lt;b')
  })

  test('行内代码不执行 HTML', () => {
    const html = renderMarkdown('使用 `<script>` 危险。')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  test('表格渲染', () => {
    const md = '| a | b |\n| --- | --- |\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>1</td>')
  })

  test('列表、引用、加粗与链接', () => {
    const md = '- 甲\n- 乙\n\n> 引用\n\n**加粗** 与 [链接](https://example.com)'
    const html = renderMarkdown(md)
    expect(html).toContain('<ul><li>甲</li><li>乙</li></ul>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('<a href="https://example.com">链接</a>')
  })
})

describe('extractPlainText', () => {
  test('剥离标签', () => {
    expect(extractPlainText('<p>hello <b>world</b></p>')).toBe('hello world')
  })
})
