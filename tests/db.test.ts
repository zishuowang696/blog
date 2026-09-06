import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'

const testDb = join(import.meta.dir, '.tmp-test.sqlite')

type DbMod = typeof import('../src/lib/db.ts')
let db: DbMod

beforeAll(async () => {
  for (const suffix of ['', '-wal', '-shm']) {
    if (existsSync(`${testDb}${suffix}`)) rmSync(`${testDb}${suffix}`)
  }
  process.env.BLOG_DB_FILE = testDb
  db = await import('../src/lib/db.ts')
  db.openDb()
  db.syncContent()
})

describe('db: syncContent', () => {
  test('同步后首页有文章', () => {
    const list = db.listPosts({ page: 1 })
    expect(list.items.length).toBeGreaterThanOrEqual(1)
    expect(list.total).toBeGreaterThanOrEqual(1)
  })

  test('文章按创建时间倒序', () => {
    const list = db.listPosts({})
    const dates = list.items.map((p) => p.created_at)
    const sorted = [...dates].sort().reverse()
    expect(dates).toEqual(sorted)
  })
})

describe('db: 查询', () => {
  test('getPost 返回已发布文章及其标签', () => {
    const list = db.listPosts({})
    const first = list.items[0]!
    const post = db.getPost(first.slug)
    expect(post).not.toBeNull()
    expect(post!.title).toBe(first.title)
    expect(Array.isArray(post!.tags)).toBe(true)
  })

  test('getPost 对不存在的 slug 返回 null', () => {
    expect(db.getPost('no-such-slug')).toBeNull()
  })

  test('listTags 有数据且 name 不重复', () => {
    const tags = db.listTags()
    expect(tags.length).toBeGreaterThan(0)
    const names = new Set(tags.map((t) => t.name))
    expect(names.size).toBe(tags.length)
  })

  test('按标签过滤与全文搜索', () => {
    const byTag = db.listPosts({ tag: 'openwrt' })
    expect(byTag.items.length).toBeGreaterThan(0)
    const byQ = db.listPosts({ q: 'TensorRT' })
    expect(byQ.items.length).toBeGreaterThan(0)
  })

  test('关于页可读取', () => {
    const page = db.getPage('about')
    expect(page).not.toBeNull()
    expect(page!.content_html).toContain('<p>')
  })
})

describe('db: 相邻文章', () => {
  test('新旧相邻互不重复', () => {
    const list = db.listPosts({})
    const mid = list.items[0]!
    const { older, newer } = db.getAdjacentPosts(mid.slug)
    expect(older?.slug).not.toBe(mid.slug)
    expect(newer?.slug).not.toBe(mid.slug)
  })
})

describe('db: 用户与会话', () => {
  test('创建用户 → 校验密码 → 登录会话 → 登出失效', async () => {
    const hash = await Bun.password.hash('password123', { algorithm: 'argon2id' })
    const user = db.createUser({ username: 'Alice', password_hash: hash })
    expect(user.username).toBe('alice')
    expect(user.role).toBe('user')

    const found = db.getUserByUsername('alice')
    expect(found?.id).toBe(user.id)
    expect(await Bun.password.verify('password123', found!.password_hash)).toBe(true)
    expect(await Bun.password.verify('wrong', found!.password_hash)).toBe(false)

    const session = db.createSession(user.id)
    expect(session.token.length).toBe(64)
    const live = db.findSession(session.token)
    expect(live?.user.username).toBe('alice')

    db.deleteSession(session.token)
    expect(db.findSession(session.token)).toBeNull()
  })

  test('用户名唯一', async () => {
    const hash = await Bun.password.hash('password123', { algorithm: 'argon2id' })
    db.createUser({ username: 'bob', password_hash: hash })
    expect(() => db.createUser({ username: 'BOB', password_hash: hash })).toThrow()
  })
})

describe('db: 评论', () => {
  test('仅可评论已发布文章，可删除', () => {
    const hash = 'x'
    const user = db.createUser({ username: 'carol', password_hash: hash })
    const slug = db.listPosts({}).items[0]!.slug

    expect(db.createComment('no-such-post', user.id, 'hello')).toBeNull()
    const comment = db.createComment(slug, user.id, '测试评论 123')
    expect(comment).not.toBeNull()
    expect(comment!.post_slug).toBe(slug)
    expect(comment!.username).toBe('carol')

    const list = db.listComments(slug)
    expect(list.length).toBe(1)
    expect(db.getCommentById(comment!.id)?.body).toBe('测试评论 123')

    expect(db.deleteComment(comment!.id)).toBe(true)
    expect(db.listComments(slug)).toHaveLength(0)
  })
})
