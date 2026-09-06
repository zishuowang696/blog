import { Database } from 'bun:sqlite'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { renderMarkdown } from './md.ts'
import { renderPageSource, renderPostSource, type PageInput, type PostInput } from './content.ts'

export const rootDir = resolve(import.meta.dir, '..', '..')
export const dbFile = Bun.env.BLOG_DB_FILE
  ? resolve(Bun.env.BLOG_DB_FILE)
  : join(rootDir, 'db', 'blog.sqlite')
const schemaFile = join(rootDir, 'db', 'schema.sql')

export const POSTS_PER_PAGE = 3

export interface Post {
  id: number
  slug: string
  title: string
  summary: string
  content_html: string
  source_md: string
  series: string
  published: boolean
  created_at: string
  updated_at: string
  tags: string[]
}

export interface Page {
  slug: string
  title: string
  content_html: string
  source_md: string
  created_at: string
  updated_at: string
}

export interface PostMeta {
  slug: string
  title: string
  date: string
  tags: string[]
  published: boolean
}

export interface PageMeta {
  slug: string
  title: string
  date: string
}

export interface PostList {
  items: Post[]
  hasMore: boolean
  page: number
  totalPages: number
  total: number
}

export interface TagCount {
  name: string
  count: number
}

interface PostRow {
  id: number
  slug: string
  title: string
  summary: string
  content_html: string
  source_md: string
  series: string
  published: number
  created_at: string
  updated_at: string
  tags: string | null
}

let db: Database | null = null

function nowIso(): string {
  return new Date().toISOString()
}

function ensureColumn(table: string, column: string, ddl: string): void {
  const d = openDb()
  const cols = d.query(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[]
  if (!cols.some((c) => c.name === column)) {
    d.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
  }
}

export function openDb(): Database {
  if (db) return db
  mkdirSync(join(rootDir, 'db'), { recursive: true })
  db = new Database(dbFile)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(readSchema())
  ensureColumn('posts', 'source_md', "TEXT NOT NULL DEFAULT ''")
  ensureColumn('pages', 'source_md', "TEXT NOT NULL DEFAULT ''")
  return db
}

function readSchema(): string {
  return readFileSync(schemaFile, 'utf8')
}

function rowToPost(r: PostRow): Post {
  return {
    ...r,
    published: r.published === 1,
    tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
  }
}

function queryTags(d: Database, postId: number): string[] {
  const rows = d.query('SELECT t.name FROM tags t JOIN post_tags pt ON pt.tag_id = t.id WHERE pt.post_id = ?').all(postId) as unknown as { name: string }[]
  return rows.map((r) => r.name)
}

function getAnyPost(slug: string): Post | null {
  const d = openDb()
  const row = d.query(`SELECT p.* FROM posts p WHERE p.slug = ?`).get(slug) as unknown as PostRow | null
  if (!row) return null
  return { ...rowToPost(row), tags: queryTags(d, row.id) }
}

export function syncTags(d: Database, postId: number, tags: string[]): void {
  const upsert = d.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING')
  const findTag = d.prepare('SELECT id FROM tags WHERE name = ?')
  const unlink = d.prepare('DELETE FROM post_tags WHERE post_id = ?')
  const link = d.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
  unlink.run(postId)
  for (const raw of tags) {
    const name = raw.trim()
    if (!name) continue
    upsert.run(name)
    const row = findTag.get(name) as { id: number }
    link.run(postId, row.id)
  }
}

export function savePost(input: PostInput): Post {
  const d = openDb()
  const contentHtml = renderMarkdown(input.body)
  const sourceMd = renderPostSource(input)
  const created = input.date || nowIso().slice(0, 10)
  const existing = getAnyPost(input.slug)
  const updated = nowIso()
  if (existing) {
    d.query(
      `UPDATE posts SET title = ?, summary = ?, content_html = ?, source_md = ?, series = ?, published = ?, created_at = ?, updated_at = ?
       WHERE slug = ?`,
    ).run(input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated, input.slug)
  } else {
    d.query(
      `INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(input.slug, input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated)
  }
  const row = getAnyPost(input.slug)!
  syncTags(d, row.id, input.tags)
  return getAnyPost(input.slug)!
}

export function deletePost(slug: string): boolean {
  const d = openDb()
  const post = d.query('SELECT id FROM posts WHERE slug = ?').get(slug) as { id: number } | null
  if (!post) return false
  d.query('DELETE FROM post_tags WHERE post_id = ?').run(post.id)
  d.query('DELETE FROM comments WHERE post_slug = ?').run(slug)
  d.query('DELETE FROM posts WHERE slug = ?').run(slug)
  return true
}

export function listAllPostsMeta(): PostMeta[] {
  const d = openDb()
  const rows = d
    .query(
      `SELECT p.slug, p.title, p.published, p.created_at,
              (SELECT GROUP_CONCAT(t.name, ',') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id) AS tags
       FROM posts p ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all() as unknown as (Pick<PostRow, 'slug' | 'title' | 'published' | 'created_at'> & { tags: string | null })[]
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    date: r.created_at.slice(0, 10),
    tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
    published: r.published === 1,
  }))
}

export function getPostSource(slug: string): Post | null {
  const d = openDb()
  const row = d.query('SELECT p.* FROM posts p WHERE p.slug = ?').get(slug) as unknown as PostRow | null
  if (!row) return null
  return { ...rowToPost(row), tags: queryTags(d, row.id) }
}

export function savePage(input: PageInput): Page {
  const d = openDb()
  const contentHtml = renderMarkdown(input.body)
  const sourceMd = renderPageSource(input)
  const created = input.date || nowIso().slice(0, 10)
  const updated = nowIso()
  d.query(
    `INSERT INTO pages (slug, title, content_html, source_md, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, content_html = excluded.content_html, source_md = excluded.source_md,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
  ).run(input.slug, input.title, contentHtml, sourceMd, created, updated)
  return getPage(input.slug)!
}

export function deletePage(slug: string): boolean {
  const result = openDb().query('DELETE FROM pages WHERE slug = ?').run(slug)
  return Number(result.changes) > 0
}

export function listAllPagesMeta(): PageMeta[] {
  const d = openDb()
  const rows = d
    .query('SELECT slug, title, created_at FROM pages ORDER BY created_at ASC')
    .all() as unknown as { slug: string; title: string; created_at: string }[]
  return rows.map((r) => ({ slug: r.slug, title: r.title, date: r.created_at.slice(0, 10) }))
}

export function listPosts(opts: { page?: number; tag?: string; q?: string } = {}): PostList {
  const d = openDb()
  const page = Math.max(1, opts.page ?? 1)
  const limit = POSTS_PER_PAGE
  const offset = (page - 1) * limit

  const where: string[] = ['p.published = 1']
  const args: (string | number)[] = []
  if (opts.tag) {
    where.push(`EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                  WHERE pt.post_id = p.id AND t.name = ?)`)
    args.push(opts.tag)
  }
  if (opts.q) {
    where.push(`(p.title LIKE ? OR p.summary LIKE ? OR p.content_html LIKE ? OR p.series LIKE ?)`)
    const like = `%${opts.q}%`
    args.push(like, like, like, like)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`

  const total = (d.query(`SELECT COUNT(*) AS n FROM posts p ${whereSql}`).get(...args) as { n: number }).n
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const rows = d
    .query(
      `SELECT p.id, p.slug, p.title, p.summary, p.content_html, p.source_md, p.series, p.published, p.created_at, p.updated_at,
              (SELECT GROUP_CONCAT(t.name, ',') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id) AS tags
       FROM posts p
       ${whereSql}
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset) as unknown as PostRow[]

  return {
    items: rows.map(rowToPost),
    hasMore: page < totalPages,
    page,
    totalPages,
    total,
  }
}

export function getPost(slug: string): Post | null {
  const d = openDb()
  const row = d
    .query(
      `SELECT p.*,
              (SELECT GROUP_CONCAT(t.name, ',') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = p.id) AS tags
       FROM posts p
       WHERE p.slug = ? AND p.published = 1`,
    )
    .get(slug) as unknown as PostRow | null
  return row ? rowToPost(row) : null
}

export function getPage(slug: string): Page | null {
  const d = openDb()
  const row = d
    .query('SELECT slug, title, content_html, source_md, created_at, updated_at FROM pages WHERE slug = ?')
    .get(slug) as unknown as Page | null
  return row ?? null
}

export function listTags(): TagCount[] {
  const d = openDb()
  const rows = d
    .query(
      `SELECT t.name AS name, COUNT(pt.post_id) AS count
       FROM tags t
       JOIN post_tags pt ON pt.tag_id = t.id
       JOIN posts p ON p.id = pt.post_id
       WHERE p.published = 1
       GROUP BY t.name
       ORDER BY count DESC, t.name ASC`,
    )
    .all() as unknown as TagCount[]
  return rows
}

export function getAdjacentPosts(slug: string): { older: Post | null; newer: Post | null } {
  const current = getPost(slug)
  if (!current) return { older: null, newer: null }
  const d = openDb()
  const olderRow = d
    .query(
      `SELECT p.* FROM posts p WHERE p.published = 1 AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?)) ORDER BY p.created_at DESC, p.id DESC LIMIT 1`,
    )
    .get(current.created_at, current.created_at, current.id) as unknown as PostRow | null
  const newerRow = d
    .query(
      `SELECT p.* FROM posts p WHERE p.published = 1 AND (p.created_at > ? OR (p.created_at = ? AND p.id > ?)) ORDER BY p.created_at ASC, p.id ASC LIMIT 1`,
    )
    .get(current.created_at, current.created_at, current.id) as unknown as PostRow | null
  return {
    older: olderRow ? rowToPost(olderRow) : null,
    newer: newerRow ? rowToPost(newerRow) : null,
  }
}

export type Role = 'user' | 'admin'

export interface User {
  id: number
  username: string
  email: string
  display_name: string
  password_hash: string
  role: Role
  created_at: string
  updated_at: string
}

export interface Session {
  token: string
  expires_at: string
  user: User
}

export interface Comment {
  id: number
  post_slug: string
  user_id: number
  username: string
  display_name: string
  body: string
  created_at: string
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

function toRole(v: string): Role {
  return v === 'admin' ? 'admin' : 'user'
}

interface UserRow {
  id: number
  username: string
  email: string
  display_name: string
  password_hash: string
  role: string
  created_at: string
  updated_at: string
}

function rowToUser(r: UserRow): User {
  return { ...r, role: toRole(r.role) }
}

export function getUserByUsername(username: string): User | null {
  const row = openDb().query('SELECT * FROM users WHERE username = ?').get(username) as UserRow | null
  return row ? rowToUser(row) : null
}

export function getUserById(id: number): User | null {
  const row = openDb().query('SELECT * FROM users WHERE id = ?').get(id) as UserRow | null
  return row ? rowToUser(row) : null
}

export function createUser(input: {
  username: string
  email?: string
  display_name?: string
  password_hash: string
  role?: Role
}): User {
  const d = openDb()
  const username = input.username.trim().toLowerCase()
  const now = nowIso()
  const result = d
    .query(
      `INSERT INTO users (username, email, display_name, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      username,
      (input.email ?? '').trim().toLowerCase(),
      (input.display_name ?? username).trim(),
      input.password_hash,
      input.role ?? 'user',
      now,
      now,
    )
  return getUserById(Number(result.lastInsertRowid))!
}

export function setUserRole(id: number, role: Role): boolean {
  const result = openDb().query('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, nowIso(), id)
  return Number(result.changes) > 0
}

export function createSession(userId: number): Session {
  const d = openDb()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  d.query('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    expiresAt,
    nowIso(),
  )
  return { token, expires_at: expiresAt, user: getUserById(userId)! }
}

export function findSession(token: string): Session | null {
  const d = openDb()
  const row = d
    .query(
      `SELECT s.token, s.expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    )
    .get(token) as (UserRow & { token: string; expires_at: string }) | null
  if (!row) return null
  if (row.expires_at <= nowIso()) {
    deleteSession(token)
    return null
  }
  return { token: row.token, expires_at: row.expires_at, user: rowToUser(row) }
}

export function deleteSession(token: string): void {
  openDb().query('DELETE FROM sessions WHERE token = ?').run(token)
}

export function pruneSessions(): void {
  openDb().query('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso())
}

export function listComments(postSlug: string): Comment[] {
  const rows = openDb()
    .query(
      `SELECT c.id, c.post_slug, c.user_id, c.body, c.created_at,
              u.username, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_slug = ?
       ORDER BY c.created_at ASC, c.id ASC`,
    )
    .all(postSlug) as unknown as Comment[]
  return rows
}

export function createComment(postSlug: string, userId: number, body: string): Comment | null {
  const d = openDb()
  const post = d.query('SELECT id FROM posts WHERE slug = ? AND published = 1').get(postSlug) as
    | { id: number }
    | null
  if (!post) return null
  const result = d
    .query('INSERT INTO comments (post_slug, user_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(postSlug, userId, body, nowIso())
  const id = Number(result.lastInsertRowid)
  return listComments(postSlug).find((c) => c.id === id) ?? null
}

export function deleteComment(id: number): boolean {
  const result = openDb().query('DELETE FROM comments WHERE id = ?').run(id)
  return Number(result.changes) > 0
}

export function getCommentById(id: number): Comment | null {
  const row = openDb()
    .query(
      `SELECT c.id, c.post_slug, c.user_id, c.body, c.created_at,
              u.username, u.display_name
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
    )
    .get(id) as unknown as Comment | null
  return row ?? null
}
