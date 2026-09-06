import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'

const testDb = join(import.meta.dir, '.tmp-test.sqlite')

type DbMod = typeof import('../src/lib/db.ts')
let db: DbMod

function postInput(over: Partial<Parameters<DbMod['savePost']>[0]> = {}) {
  return {
    slug: 'alpha-post',
    title: 'Alpha 测试文章',
    date: '2026-08-02',
    tags: ['openwrt', '学习'],
    summary: '用于 DB 测试的摘要',
    series: '测试系列',
    published: true,
    body: '正文包含 TensorRT 关键字',
    ...over,
  }
}

beforeAll(async () => {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(`${testDb}${suffix}`)) rmSync(`${testDb}${suffix}`)
  }
  process.env.BLOG_DB_FILE = testDb
  db = await import('../src/lib/db.ts')
  db.openDb()
  db.savePost(postInput({ slug: 'alpha-post', date: '2026-08-02' }))
  db.savePost(postInput({ slug: 'beta-post', title: 'Beta 第二篇', tags: ['openwrt', 'ai网关'], date: '2026-08-10', published: false }))
  db.savePage({ slug: 'about', title: '关于', date: '2026-08-01', body: '这是一段关于页。' })
})

describe('db: save/list', () => {
  test('已发布与草稿：listPosts 只见已发布', () => {
    const list = db.listPosts({ page: 1 })
    const slugs = list.items.map((p) => p.slug)
    expect(slugs).toContain('alpha-post')
    expect(slugs).not.toContain('beta-post')
    expect(list.total).toBe(1)
  })

  test('listAllPostsMeta 能看到草稿', () => {
    const metas = db.listAllPostsMeta()
    const beta = metas.find((m) => m.slug === 'beta-post')
    expect(beta?.published).toBe(false)
    expect(beta?.tags).toEqual(['openwrt', 'ai网关'])
  })

  test('保存保留 source_md 并可回读', () => {
    const post = db.getPostSource('alpha-post')
    expect(post?.source_md).toContain('title: "Alpha 测试文章"')
    expect(post?.source_md).toContain('published: true')
    const parsed = post?.source_md ?? ''
    expect(parsed).toContain('正文包含 TensorRT')
  })

  test('覆盖更新与标签重建', () => {
    db.savePost(postInput({ slug: 'alpha-post', tags: ['yocto'], body: '更新后的正文' }))
    const post = db.getPostSource('alpha-post')
    expect(post?.tags).toEqual(['yocto'])
    expect(post?.content_html).toContain('更新后的正文')
  })
})

describe('db: 查询', () => {
  test('按标签过滤与全文搜索', () => {
    const byTag = db.listPosts({ tag: 'yocto' })
    expect(byTag.items.length).toBe(1)
    const byQ = db.listPosts({ q: 'TensorRT' })
    expect(byQ.items.length).toBe(0) // 覆盖后正文已不含
    const old = db.listPosts({ q: '更新后的正文' })
    expect(old.items.length).toBe(1)
  })

  test('页面可读取', () => {
    const page = db.getPage('about')
    expect(page).not.toBeNull()
    expect(page!.content_html).toContain('<p>')
  })
})

describe('db: 删除连带清理', () => {
  test('删除文章会连评论一并删除', () => {
    const slug = 'alpha-post'
    const user = db.createUser({ username: 'deluser', password_hash: 'x' })
    const c = db.createComment(slug, user.id, '要删的评论')
    expect(c).not.toBeNull()
    expect(db.deletePost(slug)).toBe(true)
    expect(db.listComments(slug)).toHaveLength(0)
    expect(db.getPostSource(slug)).toBeNull()
    db.savePost(postInput({ slug })) // 还原供其它用例
  })
})

describe('db: 相邻文章', () => {
  test('返回新旧相邻', () => {
    const list = db.listPosts({})
    const mid = list.items[0]!
    const { older, newer } = db.getAdjacentPosts(mid.slug)
    expect(older?.slug).not.toBe(mid.slug)
    expect(newer?.slug).not.toBe(mid.slug)
  })
})

describe('db: 用户与会话', () => {
  test('创建用户 → 会话 → 登出失效', async () => {
    const hash = await Bun.password.hash('password123', { algorithm: 'argon2id' })
    const user = db.createUser({ username: 'alice', password_hash: hash })
    expect(user.username).toBe('alice')
    expect(user.role).toBe('user')

    const found = db.getUserByUsername('alice')
    expect(await Bun.password.verify('password123', found!.password_hash)).toBe(true)

    const session = db.createSession(user.id)
    expect(session.token.length).toBe(64)
    expect(db.findSession(session.token)?.user.username).toBe('alice')
    db.deleteSession(session.token)
    expect(db.findSession(session.token)).toBeNull()
  })

  test('用户名唯一', async () => {
    const hash = 'h'
    db.createUser({ username: 'bob', password_hash: hash })
    expect(() => db.createUser({ username: 'BOB', password_hash: hash })).toThrow()
  })
})
