import { renderMarkdown } from './md.ts'
import { renderPageSource, renderPostSource, type PageInput, type PostInput } from './content.ts'
import { useEngine } from './engine.ts'

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

function nowIso(): string {
  return new Date().toISOString()
}

function postFrom(r: PostRow): Post {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    content_html: r.content_html,
    source_md: r.source_md,
    series: r.series,
    published: r.published === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
    tags: r.tags ? r.tags.split(',').filter(Boolean) : [],
  }
}

export function toUserRow(r: UserRow) {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    display_name: r.display_name,
    password_hash: r.password_hash,
    role: r.role === 'admin' ? ('admin' as const) : ('user' as const),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

function rowTags(): string {
  return `(SELECT GROUP_CONCAT(t.name, ',') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id = posts.id) AS tags`
}

function postSelectSql(): string {
  return `SELECT posts.id, posts.slug, posts.title, posts.summary, posts.content_html, posts.source_md,
                 posts.series, posts.published, posts.created_at, posts.updated_at,
                 ${rowTags()} FROM posts`
}

function getPostByWhere(sql: string, params: (string | number)[]): Promise<Post | null> {
  return useEngine()
    .first(sql, params)
    .then((r) => (r ? postFrom(r as unknown as PostRow) : null))
}

export async function getPost(slug: string): Promise<Post | null> {
  return getPostByWhere(`${postSelectSql()} WHERE posts.slug = ? AND posts.published = 1`, [slug])
}

async function getAnyPost(slug: string): Promise<Post | null> {
  return getPostByWhere(`${postSelectSql()} WHERE posts.slug = ?`, [slug])
}

export function getPostSource(slug: string): Promise<Post | null> {
  return getAnyPost(slug)
}

export async function savePost(input: PostInput): Promise<Post> {
  const e = useEngine()
  const contentHtml = renderMarkdown(input.body)
  const sourceMd = renderPostSource(input)
  const created = input.date || nowIso().slice(0, 10)
  const updated = nowIso()
  const existing = await e.first('SELECT id FROM posts WHERE slug = ?', [input.slug])
  if (existing) {
    await e.run(
      `UPDATE posts SET title = ?, summary = ?, content_html = ?, source_md = ?, series = ?, published = ?, created_at = ?, updated_at = ? WHERE slug = ?`,
      [input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated, input.slug],
    )
  } else {
    await e.run(
      `INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.slug, input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated],
    )
  }
  const row = await e.first('SELECT id FROM posts WHERE slug = ?', [input.slug])
  if (row) {
    await syncTags(Number(row.id), input.tags)
  }
  return (await getAnyPost(input.slug))!
}

export async function deletePost(slug: string): Promise<boolean> {
  const e = useEngine()
  const post = await e.first('SELECT id FROM posts WHERE slug = ?', [slug])
  if (!post) return false
  await syncTags(Number(post.id), [])
  await e.run('DELETE FROM comments WHERE post_slug = ?', [slug])
  await e.run('DELETE FROM posts WHERE slug = ?', [slug])
  return true
}

async function syncTags(postId: number, tags: string[]): Promise<void> {
  const e = useEngine()
  await e.run('DELETE FROM post_tags WHERE post_id = ?', [postId])
  for (const raw of tags) {
    const name = raw.trim()
    if (!name) continue
    await e.run('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING', [name])
    const t = await e.first('SELECT id FROM tags WHERE name = ?', [name])
    if (t) {
      await e.run('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, Number(t.id)])
    }
  }
}

export async function listAllPostsMeta(): Promise<PostMeta[]> {
  const rows = await useEngine().all(
    `SELECT posts.slug, posts.title, posts.published, posts.created_at, ${rowTags()} FROM posts
     ORDER BY posts.created_at DESC, posts.id DESC`,
  )
  return rows.map((r) => {
    const rr = r as unknown as { slug: string; title: string; published: number; created_at: string; tags: string | null }
    return {
      slug: rr.slug,
      title: rr.title,
      date: rr.created_at.slice(0, 10),
      tags: rr.tags ? rr.tags.split(',').filter(Boolean) : [],
      published: rr.published === 1,
    }
  })
}

export async function savePage(input: PageInput): Promise<Page> {
  const e = useEngine()
  const contentHtml = renderMarkdown(input.body)
  const sourceMd = renderPageSource(input)
  const created = input.date || nowIso().slice(0, 10)
  const updated = nowIso()
  await e.run(
    `INSERT INTO pages (slug, title, content_html, source_md, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       title = excluded.title, content_html = excluded.content_html, source_md = excluded.source_md,
       created_at = excluded.created_at, updated_at = excluded.updated_at`,
    [input.slug, input.title, contentHtml, sourceMd, created, updated],
  )
  return (await getPage(input.slug))!
}

export async function deletePage(slug: string): Promise<boolean> {
  const r = await useEngine().run('DELETE FROM pages WHERE slug = ?', [slug])
  return r.changes > 0
}

export async function listAllPagesMeta(): Promise<PageMeta[]> {
  const rows = await useEngine().all('SELECT slug, title, created_at FROM pages ORDER BY created_at ASC')
  return rows.map((r) => {
    const rr = r as unknown as { slug: string; title: string; created_at: string }
    return { slug: rr.slug, title: rr.title, date: rr.created_at.slice(0, 10) }
  })
}

export async function listPosts(opts: { page?: number; tag?: string; q?: string } = {}): Promise<PostList> {
  const e = useEngine()
  const page = Math.max(1, opts.page ?? 1)
  const limit = POSTS_PER_PAGE
  const offset = (page - 1) * limit

  const where: string[] = ['posts.published = 1']
  const args: (string | number)[] = []
  if (opts.tag) {
    where.push(`EXISTS (SELECT 1 FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                  WHERE pt.post_id = posts.id AND t.name = ?)`)
    args.push(opts.tag)
  }
  if (opts.q) {
    where.push(`(posts.title LIKE ? OR posts.summary LIKE ? OR posts.content_html LIKE ? OR posts.series LIKE ?)`)
    const like = `%${opts.q}%`
    args.push(like, like, like, like)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRow = await e.first(`SELECT COUNT(*) AS n FROM posts ${whereSql}`, args)
  const total = Number(totalRow?.n ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const rows = await e.all(`${postSelectSql()} ${whereSql} ORDER BY posts.created_at DESC, posts.id DESC LIMIT ? OFFSET ?`, [...args, limit, offset])
  return {
    items: rows.map((r) => postFrom(r as unknown as PostRow)),
    hasMore: page < totalPages,
    page,
    totalPages,
    total,
  }
}

export async function getPage(slug: string): Promise<Page | null> {
  const row = await useEngine().first(
    `SELECT slug, title, content_html, source_md, created_at, updated_at FROM pages WHERE slug = ?`,
    [slug],
  )
  return row ? (row as unknown as Page) : null
}

export async function listTags(): Promise<TagCount[]> {
  const rows = await useEngine().all(
    `SELECT t.name AS name, COUNT(pt.post_id) AS count
     FROM tags t
     JOIN post_tags pt ON pt.tag_id = t.id
     JOIN posts p ON p.id = pt.post_id
     WHERE p.published = 1
     GROUP BY t.name
     ORDER BY count DESC, t.name ASC`,
  )
  return rows as unknown as TagCount[]
}

export async function getAdjacentPosts(slug: string): Promise<{ older: Post | null; newer: Post | null }> {
  const current = await getPost(slug)
  if (!current) return { older: null, newer: null }
  const e = useEngine()
  const older = await e.first(
    `${postSelectSql()} WHERE posts.published = 1 AND (posts.created_at < ? OR (posts.created_at = ? AND posts.id < ?))
     ORDER BY posts.created_at DESC, posts.id DESC LIMIT 1`,
    [current.created_at, current.created_at, current.id],
  )
  const newer = await e.first(
    `${postSelectSql()} WHERE posts.published = 1 AND (posts.created_at > ? OR (posts.created_at = ? AND posts.id > ?))
     ORDER BY posts.created_at ASC, posts.id ASC LIMIT 1`,
    [current.created_at, current.created_at, current.id],
  )
  return {
    older: older ? postFrom(older as unknown as PostRow) : null,
    newer: newer ? postFrom(newer as unknown as PostRow) : null,
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

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  let hex = ''
  for (const b of arr) hex += b.toString(16).padStart(2, '0')
  return hex
}

function userFromRow(r: unknown): User {
  return toUserRow(r as unknown as UserRow)
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await useEngine().first('SELECT * FROM users WHERE username = ?', [username])
  return row ? userFromRow(row) : null
}

export async function getUserById(id: number): Promise<User | null> {
  const row = await useEngine().first('SELECT * FROM users WHERE id = ?', [id])
  return row ? userFromRow(row) : null
}

export async function createUser(input: {
  username: string
  email?: string
  display_name?: string
  password_hash: string
  role?: Role
}): Promise<User> {
  const e = useEngine()
  const username = input.username.trim().toLowerCase()
  const now = nowIso()
  await e.run(
    `INSERT INTO users (username, email, display_name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      username,
      (input.email ?? '').trim().toLowerCase(),
      (input.display_name ?? username).trim(),
      input.password_hash,
      input.role ?? 'user',
      now,
      now,
    ],
  )
  return (await getUserByUsername(username))!
}

export async function setUserRole(id: number, role: Role): Promise<boolean> {
  const r = await useEngine().run('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, nowIso(), id])
  return r.changes > 0
}

export async function createSession(userId: number): Promise<Session> {
  const e = useEngine()
  const token = randomHex(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  await e.run('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', [
    token,
    userId,
    expiresAt,
    nowIso(),
  ])
  return { token, expires_at: expiresAt, user: (await getUserById(userId))! }
}

export async function findSession(token: string): Promise<Session | null> {
  const e = useEngine()
  const row = await e.first(
    `SELECT s.token AS token, s.expires_at AS expires_at, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    [token],
  )
  if (!row) return null
  const rr = row as unknown as { token: string; expires_at: string } & UserRow
  if (rr.expires_at <= nowIso()) {
    await deleteSession(token)
    return null
  }
  return { token: rr.token, expires_at: rr.expires_at, user: toUserRow(rr) }
}

export async function deleteSession(token: string): Promise<void> {
  await useEngine().run('DELETE FROM sessions WHERE token = ?', [token])
}

export async function pruneSessions(): Promise<void> {
  await useEngine().run('DELETE FROM sessions WHERE expires_at <= ?', [nowIso()])
}

export async function listComments(postSlug: string): Promise<Comment[]> {
  const rows = await useEngine().all(
    `SELECT c.id, c.post_slug, c.user_id, c.body, c.created_at, u.username, u.display_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_slug = ?
     ORDER BY c.created_at ASC, c.id ASC`,
    [postSlug],
  )
  return rows as unknown as Comment[]
}

export async function createComment(postSlug: string, userId: number, body: string): Promise<Comment | null> {
  const e = useEngine()
  const post = await e.first('SELECT id FROM posts WHERE slug = ? AND published = 1', [postSlug])
  if (!post) return null
  const res = await e.run('INSERT INTO comments (post_slug, user_id, body, created_at) VALUES (?, ?, ?, ?)', [
    postSlug,
    userId,
    body,
    nowIso(),
  ])
  const id = res.lastInsertRowid
  const list = await listComments(postSlug)
  return list.find((c) => c.id === id) ?? null
}

export async function deleteComment(id: number): Promise<boolean> {
  const r = await useEngine().run('DELETE FROM comments WHERE id = ?', [id])
  return r.changes > 0
}

export async function getCommentById(id: number): Promise<Comment | null> {
  const row = await useEngine().first(
    `SELECT c.id, c.post_slug, c.user_id, c.body, c.created_at, u.username, u.display_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [id],
  )
  return row ? (row as unknown as Comment) : null
}
