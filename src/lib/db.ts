import { Database } from 'bun:sqlite'
import { randomBytes } from 'node:crypto'
import { join, resolve } from 'node:path'
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'
import { parseFrontmatter, renderMarkdown } from './md.ts'

export const rootDir = resolve(import.meta.dir, '..', '..')
export const dbFile = Bun.env.BLOG_DB_FILE
  ? resolve(Bun.env.BLOG_DB_FILE)
  : join(rootDir, 'db', 'blog.sqlite')
const schemaFile = join(rootDir, 'db', 'schema.sql')
const contentDir = join(rootDir, 'content', 'posts')
const pagesDir = join(rootDir, 'content', 'pages')

export const postsDir = contentDir
export const pagesContentDir = pagesDir

export const POSTS_PER_PAGE = 3

export interface Post {
  id: number
  slug: string
  title: string
  summary: string
  content_html: string
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
  created_at: string
  updated_at: string
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
  series: string
  published: number
  created_at: string
  updated_at: string
  tags: string | null
}

let db: Database | null = null

export function openDb(): Database {
  if (db) return db
  mkdirSync(join(rootDir, 'db'), { recursive: true })
  db = new Database(dbFile)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(readFileSync(schemaFile, 'utf8'))
  return db
}

function rowToPost(r: PostRow): Post {
  return {
    ...r,
    published: r.published === 1,
    tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function resolveDate(date: unknown): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10)
  return nowIso()
}

function readMarkdownFiles(dir: string): string[] {
  if (!dirExists(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
}

function dirExists(dir: string): boolean {
  try {
    readdirSync(dir)
    return true
  } catch {
    return false
  }
}

export interface SyncResult {
  upsertedPosts: number
  unpublishedPosts: number
  upsertedPages: number
  removedPages: number
}

export function syncContent(): SyncResult {
  const d = openDb()
  const upsertPost = d.prepare(
    `INSERT INTO posts (slug, title, summary, content_html, series, published, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       summary = excluded.summary,
       content_html = excluded.content_html,
       series = excluded.series,
       published = excluded.published,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
  )
  const upsertTags = d.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING')
  const findTag = d.prepare('SELECT id FROM tags WHERE name = ?')
  const linkTag = d.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)')
  const unlinkAll = d.prepare('DELETE FROM post_tags WHERE post_id = ?')
  const findPostId = d.prepare('SELECT id FROM posts WHERE slug = ?')

  let upsertedPosts = 0
  const mdSlugs = new Set<string>()

  for (const file of readMarkdownFiles(contentDir)) {
    const slug = file.slice(0, -3)
    mdSlugs.add(slug)
    const src = readFileSync(join(contentDir, file), 'utf8')
    const { data, body } = parseFrontmatter(src)
    const tags = Array.isArray(data.tags) ? data.tags.map(String) : []
    const published = data.published !== false
    const created = resolveDate(data.date)
    const updated = nowIso()
    upsertPost.run(
      slug,
      String(data.title ?? slug),
      String(data.summary ?? ''),
      renderMarkdown(body),
      String(data.series ?? ''),
      published ? 1 : 0,
      created,
      updated,
    )
    const post = findPostId.get(slug) as { id: number }
    unlinkAll.run(post.id)
    for (const tag of tags) {
      const name = tag.trim()
      if (!name) continue
      upsertTags.run(name)
      const row = findTag.get(name) as { id: number }
      linkTag.run(post.id, row.id)
    }
    upsertedPosts++
  }

  let unpublishedPosts = 0
  if (mdSlugs.size > 0) {
    const slugs = Array.from(mdSlugs)
    const qmarks = slugs.map(() => '?').join(',')
    const result = d.run(
      `UPDATE posts SET published = 0 WHERE published = 1 AND slug NOT IN (${qmarks})`,
      slugs,
    )
    unpublishedPosts = Number(result.changes)
  }

  const upsertPage = d.prepare(
    `INSERT INTO pages (slug, title, content_html, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title,
       content_html = excluded.content_html,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
  )
  const pageSlugs = new Set<string>()
  for (const file of readMarkdownFiles(pagesDir)) {
    const slug = file.slice(0, -3)
    pageSlugs.add(slug)
    const src = readFileSync(join(pagesDir, file), 'utf8')
    const { data, body } = parseFrontmatter(src)
    upsertPage.run(
      slug,
      String(data.title ?? slug),
      renderMarkdown(body),
      resolveDate(data.date),
      nowIso(),
    )
  }
  let removedPages = 0
  if (pageSlugs.size > 0) {
    const slugs = Array.from(pageSlugs)
    const qmarks = slugs.map(() => '?').join(',')
    const result = d.run(`DELETE FROM pages WHERE slug NOT IN (${qmarks})`, slugs)
    removedPages = Number(result.changes)
  }

  return { upsertedPosts, unpublishedPosts, upsertedPages: pageSlugs.size, removedPages }
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
      `SELECT p.id, p.slug, p.title, p.summary, p.content_html, p.series, p.published, p.created_at, p.updated_at,
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
  const row = d.query(`SELECT slug, title, content_html, created_at, updated_at FROM pages WHERE slug = ?`).get(slug) as
    | Omit<Page, 'content_html'> & { content_html: string }
    | undefined
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

