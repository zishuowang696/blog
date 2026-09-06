import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'

const testDb = join(import.meta.dir, '.tmp-test.sqlite')

type DbMod = typeof import('../src/lib/db.ts')
type SqliteMod = typeof import('../src/lib/engine/sqlite.ts')
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
  const sqlite: SqliteMod = await import('../src/lib/engine/sqlite.ts')
  await sqlite.initLocalDb()
  db = await import('../src/lib/db.ts')
  await db.savePost(postInput({ slug: 'alpha-post', date: '2026-08-02' }))
  await db.savePost(postInput({ slug: 'beta-post', title: 'Beta 第二篇', tags: ['openwrt', 'ai网关'], date: '2026-08-10', published: false }))
  await db.savePage({ slug: 'about', title: '关于', date: '2026-08-01', body: '这是一段关于页。' })
})

describe('db: save/list', () => {
  test('已发布与草稿：listPosts 只见已发布', async () => {
    const list = await db.listPosts({ page: 1 })
    const slugs = list.items.map((p) => p.slug)
    expect(slugs).toContain('alpha-post')
    expect(slugs).not.toContain('beta-post')
    expect(list.total).toBe(1)
  })

  test('listAllPostsMeta 能看到草稿', async () => {
    const metas = await db.listAllPostsMeta()
    const beta = metas.find((m) => m.slug === 'beta-post')
    expect(beta?.published).toBe(false)
    expect(beta?.tags).toEqual(['openwrt', 'ai网关'])
  })

  test('保存保留 source_md 并可回读', async () => {
    const post = await db.getPostSource('alpha-post')
    expect(post?.source_md).toContain('title: "Alpha 测试文章"')
    expect(post?.source_md).toContain('published: true')
    expect(post?.source_md).toContain('正文包含 TensorRT')
  })

  test('覆盖更新与标签重建', async () => {
    await db.savePost(postInput({ slug: 'alpha-post', tags: ['yocto'], body: '更新后的正文' }))
    const post = await db.getPostSource('alpha-post')
    expect(post?.tags).toEqual(['yocto'])
    expect(post?.content_html).toContain('更新后的正文')
  })
})

describe('db: 查询', () => {
  test('按标签过滤与全文搜索', async () => {
    const byTag = await db.listPosts({ tag: 'yocto' })
    expect(byTag.items.length).toBe(1)
    const gone = await db.listPosts({ q: 'TensorRT' })
    expect(gone.items.length).toBe(0)
    const hit = await db.listPosts({ q: '更新后的正文' })
    expect(hit.items.length).toBe(1)
  })

  test('页面可读取', async () => {
    const page = await db.getPage('about')
    expect(page).not.toBeNull()
    expect(page!.content_html).toContain('<p>')
  })
})

describe('db: 删除连带清理', () => {
  test('删除文章会连评论一并删除', async () => {
    const slug = 'alpha-post'
    const user = await db.createUser({ username: 'deluser', password_hash: 'x' })
    const c = await db.createComment(slug, user.id, '要删的评论')
    expect(c).not.toBeNull()
    expect(await db.deletePost(slug)).toBe(true)
    expect(await db.listComments(slug)).toHaveLength(0)
    expect(await db.getPostSource(slug)).toBeNull()
    await db.savePost(postInput({ slug }))
  })
})

describe('db: 相邻文章', () => {
  test('返回新旧相邻', async () => {
    const list = await db.listPosts({})
    const mid = list.items[0]!
    const { older, newer } = await db.getAdjacentPosts(mid.slug)
    expect(older?.slug).not.toBe(mid.slug)
    expect(newer?.slug).not.toBe(mid.slug)
  })
})

describe('db: 用户与会话', () => {
  test('创建用户 → 会话 → 登出失效', async () => {
    const user = await db.createUser({ username: 'alice', password_hash: 'pbkdf2$1$00$00' })
    expect(user.username).toBe('alice')
    expect(user.role).toBe('user')

    const found = await db.getUserByUsername('alice')
    expect(found?.id).toBe(user.id)

    const session = await db.createSession(user.id)
    expect(session.token.length).toBe(64)
    expect((await db.findSession(session.token))?.user.username).toBe('alice')
    await db.deleteSession(session.token)
    expect(await db.findSession(session.token)).toBeNull()
  })

  test('用户名唯一', async () => {
    await db.createUser({ username: 'bob', password_hash: 'x' })
    await expect(db.createUser({ username: 'BOB', password_hash: 'x' })).rejects.toThrow()
  })
})
