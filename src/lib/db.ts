import { renderMarkdown } from './md.ts'
import { renderPageSource, renderPostSource, type PageInput, type PostInput } from './content.ts'
import { useEngine } from './engine.ts'

export const POSTS_PER_PAGE = 6

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
  title_en?: string
  summary_en?: string
  body_en?: string
  content_html_en?: string
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
  title_en: string
  summary_en: string
  body_en: string
  content_html_en: string
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
    title_en: r.title_en,
    summary_en: r.summary_en,
    body_en: r.body_en,
    content_html_en: r.content_html_en,
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

type Lang = 'zh' | 'en'

function pickField(zhCol: string, enCol: string, lang: Lang): string {
  if (lang !== 'en') return `posts.${zhCol}`
  return `CASE WHEN posts.${enCol} IS NOT NULL AND posts.${enCol} <> '' THEN posts.${enCol} ELSE posts.${zhCol} END`
}

function canonicalSelect(): string {
  return `SELECT posts.id, posts.slug, posts.title, posts.title_en, posts.summary, posts.summary_en,
                 posts.content_html, posts.content_html_en, posts.source_md, posts.body_en,
                 posts.series, posts.published, posts.created_at, posts.updated_at, ${rowTags()} FROM posts`
}

function localizedSelect(lang: Lang): string {
  return `SELECT posts.id, posts.slug, ${pickField('title', 'title_en', lang)} AS title,
                 ${pickField('summary', 'summary_en', lang)} AS summary,
                 ${pickField('content_html', 'content_html_en', lang)} AS content_html,
                 posts.source_md, posts.body_en, posts.series, posts.published, posts.created_at, posts.updated_at,
                 posts.title_en, posts.summary_en, posts.content_html_en, ${rowTags()} FROM posts`
}

function getPostByWhere(sql: string, params: (string | number)[]): Promise<Post | null> {
  return useEngine()
    .first(sql, params)
    .then((r) => (r ? postFrom(r as unknown as PostRow) : null))
}

export async function getPost(slug: string, lang: Lang = 'en'): Promise<Post | null> {
  return getPostByWhere(`${localizedSelect(lang)} WHERE posts.slug = ? AND posts.published = 1`, [slug])
}

export async function getPostSource(slug: string): Promise<Post | null> {
  return getPostByWhere(`${canonicalSelect()} WHERE posts.slug = ?`, [slug])
}

export async function savePost(input: PostInput): Promise<Post> {
  const e = useEngine()
  const contentHtml = renderMarkdown(input.body)
  const sourceMd = renderPostSource(input)
  const created = input.date || nowIso().slice(0, 10)
  const updated = nowIso()
  const prev = await e.first('SELECT title_en, summary_en, body_en, content_html_en FROM posts WHERE slug = ?', [input.slug])
  const keep = (newVal: string | undefined, oldVal: string | null | undefined): string =>
    newVal !== undefined ? newVal : (oldVal ?? '')
  const titleEn = keep(input.title_en, prev?.title_en as string | undefined)
  const summaryEn = keep(input.summary_en, prev?.summary_en as string | undefined)
  const bodyEn = keep(input.body_en, prev?.body_en as string | undefined)
  const contentHtmlEnFinal = input.body_en !== undefined
    ? (input.body_en ? renderMarkdown(input.body_en) : '')
    : (prev?.content_html_en as string ?? '')
  const existing = prev !== null && prev !== undefined
  const enSql = `title_en = ?, summary_en = ?, body_en = ?, content_html_en = ?`
  if (existing) {
    await e.run(
      `UPDATE posts SET title = ?, summary = ?, content_html = ?, source_md = ?, series = ?, published = ?, created_at = ?, updated_at = ?, ${enSql} WHERE slug = ?`,
      [input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated, titleEn, summaryEn, bodyEn, contentHtmlEnFinal, input.slug],
    )
  } else {
    await e.run(
      `INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.slug, input.title, input.summary, contentHtml, sourceMd, input.series, input.published ? 1 : 0, created, updated, titleEn, summaryEn, bodyEn, contentHtmlEnFinal],
    )
  }
  const row = await e.first('SELECT id FROM posts WHERE slug = ?', [input.slug])
  if (row) {
    await syncTags(Number(row.id), input.tags)
  }
  return (await getPostSource(input.slug))!
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

export async function listAllPostsMeta(opts: { includeUnpublished?: boolean } = {}): Promise<PostMeta[]> {
  const where = opts.includeUnpublished ? '' : 'WHERE posts.published = 1'
  const rows = await useEngine().all(
    `SELECT posts.slug, posts.title, posts.published, posts.created_at, ${rowTags()} FROM posts
     ${where}
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

export interface LatestPost {
  slug: string
  title: string
  summary: string
  date: string
}

export async function listRecentPosts(limit = 20, lang: Lang = 'zh'): Promise<LatestPost[]> {
  const rows = await useEngine().all(
    `SELECT posts.slug AS slug, ${pickField('title', 'title_en', lang)} AS title,
            ${pickField('summary', 'summary_en', lang)} AS summary, posts.created_at AS created_at
     FROM posts
     WHERE posts.published = 1
     ORDER BY posts.created_at DESC, posts.id DESC
     LIMIT ?`,
    [limit],
  )
  return rows.map((r) => {
    const rr = r as unknown as { slug: string; title: string; summary: string; created_at: string }
    return { slug: rr.slug, title: rr.title, summary: rr.summary ?? '', date: rr.created_at.slice(0, 10) }
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

export async function listPosts(opts: { page?: number; tag?: string; series?: string; q?: string; lang?: Lang } = {}): Promise<PostList> {
  const e = useEngine()
  const lang = opts.lang ?? 'en'
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
  if (opts.series) {
    where.push('posts.series = ?')
    args.push(opts.series)
  }
  if (opts.q) {
    where.push(
      `(posts.title LIKE ? OR posts.summary LIKE ? OR posts.content_html LIKE ? OR posts.series LIKE ?
        OR posts.title_en LIKE ? OR posts.summary_en LIKE ? OR posts.content_html_en LIKE ?)`,
    )
    const like = `%${opts.q}%`
    args.push(like, like, like, like, like, like, like)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`

  const totalRow = await e.first(`SELECT COUNT(*) AS n FROM posts ${whereSql}`, args)
  const total = Number(totalRow?.n ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const rows = await e.all(`${localizedSelect(lang)} ${whereSql} ORDER BY posts.created_at DESC, posts.id DESC LIMIT ? OFFSET ?`, [...args, limit, offset])
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

export async function listSeries(): Promise<TagCount[]> {
  const rows = await useEngine().all(
    `SELECT series AS name, COUNT(*) AS count
     FROM posts
     WHERE published = 1 AND series IS NOT NULL AND series <> ''
     GROUP BY series
     ORDER BY count DESC, series ASC`,
  )
  return rows as unknown as TagCount[]
}

export async function listSeriesPosts(series: string, lang: Lang = 'en'): Promise<{ slug: string; title: string }[]> {
  const rows = await useEngine().all(
    `SELECT posts.slug AS slug, ${pickField('title', 'title_en', lang)} AS title
     FROM posts
     WHERE posts.published = 1 AND posts.series = ?
     ORDER BY posts.created_at ASC, posts.id ASC`,
    [series],
  )
  return rows as unknown as { slug: string; title: string }[]
}

export async function getAdjacentPosts(slug: string, lang: Lang = 'en'): Promise<{ older: Post | null; newer: Post | null }> {
  const current = await getPost(slug, lang)
  if (!current) return { older: null, newer: null }
  const e = useEngine()
  const older = await e.first(
    `${localizedSelect(lang)} WHERE posts.published = 1 AND (posts.created_at < ? OR (posts.created_at = ? AND posts.id < ?))
     ORDER BY posts.created_at DESC, posts.id DESC LIMIT 1`,
    [current.created_at, current.created_at, current.id],
  )
  const newer = await e.first(
    `${localizedSelect(lang)} WHERE posts.published = 1 AND (posts.created_at > ? OR (posts.created_at = ? AND posts.id > ?))
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

export interface StatsOverview {
  pv: number
  uv: number
  todayPv: number
  todayUv: number
  weekPv: number
  weekUv: number
}

export interface DayStat {
  day: string
  views: number
  visitors: number
}

export interface PathStat {
  path: string
  views: number
  visitors: number
}

export interface RefererStat {
  referer: string
  views: number
}

export interface RecentView {
  path: string
  referer: string
  created_at: string
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// 东八区当天 0 点对应的 UTC 时刻（用于「今日」统计，避免 UTC 日界错位）
function shanghaiDayStartIso(offsetDays = 0): string {
  const cn = new Date(Date.now() + 8 * 3600 * 1000)
  const utcOfCnMidnight = Date.UTC(cn.getUTCFullYear(), cn.getUTCMonth(), cn.getUTCDate() + offsetDays)
  return new Date(utcOfCnMidnight - 8 * 3600 * 1000).toISOString()
}

export async function recordView(input: {
  path: string
  ip?: string
  ipHash: string
  bot?: string
  referer: string
  ua: string
}): Promise<void> {
  await useEngine().run('INSERT INTO page_views (path, ip, ip_hash, bot, referer, ua, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    input.path.slice(0, 300),
    (input.ip ?? '').slice(0, 64),
    input.ipHash,
    (input.bot ?? '').slice(0, 40),
    input.referer.slice(0, 300),
    input.ua.slice(0, 200),
    nowIso(),
  ])
}

async function countRange(whereSql: string, args: (string | number)[]): Promise<{ pv: number; uv: number }> {
  const row = await useEngine().first(`SELECT COUNT(*) AS pv, COUNT(DISTINCT ip_hash) AS uv FROM page_views ${whereSql}`, args)
  const rr = row as unknown as { pv: number | string; uv: number | string } | null
  return { pv: Number(rr?.pv ?? 0), uv: Number(rr?.uv ?? 0) }
}

export async function statsOverview(): Promise<StatsOverview> {
  const total = await countRange(`WHERE bot = ''`, [])
  const today = await countRange(`WHERE bot = '' AND created_at >= ?`, [shanghaiDayStartIso()])
  const week = await countRange(`WHERE bot = '' AND created_at >= ?`, [isoDaysAgo(7)])
  return { pv: total.pv, uv: total.uv, todayPv: today.pv, todayUv: today.uv, weekPv: week.pv, weekUv: week.uv }
}

export async function statsDaily(days = 14): Promise<DayStat[]> {
  const rows = await useEngine().all(
    `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visitors
     FROM page_views WHERE bot = '' AND created_at >= ? GROUP BY day ORDER BY day ASC`,
    [isoDaysAgo(days)],
  )
  return (rows as unknown as DayStat[]).map((r) => ({ day: r.day, views: Number(r.views), visitors: Number(r.visitors) }))
}

export async function statsTopPaths(days = 7, limit = 15): Promise<PathStat[]> {
  const rows = await useEngine().all(
    `SELECT path, COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visitors
     FROM page_views WHERE bot = '' AND created_at >= ? GROUP BY path ORDER BY views DESC LIMIT ?`,
    [isoDaysAgo(days), limit],
  )
  return (rows as unknown as PathStat[]).map((r) => ({ path: r.path, views: Number(r.views), visitors: Number(r.visitors) }))
}

export async function statsReferers(days = 7, limit = 10): Promise<RefererStat[]> {
  const rows = await useEngine().all(
    `SELECT referer, COUNT(*) AS views FROM page_views WHERE bot = '' AND created_at >= ?
     GROUP BY referer ORDER BY views DESC LIMIT ?`,
    [isoDaysAgo(days), limit],
  )
  return (rows as unknown as RefererStat[]).map((r) => ({ referer: r.referer, views: Number(r.views) }))
}

export async function statsRecent(limit = 30): Promise<RecentView[]> {
  const rows = await useEngine().all(
    `SELECT path, referer, created_at FROM page_views WHERE bot = '' ORDER BY id DESC LIMIT ?`,
    [limit],
  )
  return rows as unknown as RecentView[]
}

export interface SourceStat {
  category: string
  pv: number
  uv: number
}

export async function statsBySource(days = 7): Promise<SourceStat[]> {
  const rows = await useEngine().all(
    `SELECT CASE
       WHEN referer = '' THEN '直接访问'
       WHEN referer LIKE '%embedai.com.cn%' THEN '站内点击'
       WHEN referer LIKE '%google.%' OR referer LIKE '%bing.%' OR referer LIKE '%baidu.%' OR referer LIKE '%duckduckgo%' OR referer LIKE '%sogou%' OR referer LIKE '%so.com%' OR referer LIKE '%yandex%' THEN '搜索引擎'
       WHEN referer LIKE '%zhihu%' OR referer LIKE '%juejin%' OR referer LIKE '%csdn%' OR referer LIKE '%dev.to%' OR referer LIKE '%medium%' OR referer LIKE '%reddit%' OR referer LIKE '%github%' OR referer LIKE '%weibo%' OR referer LIKE '%twitter%' OR referer LIKE '%x.com%' OR referer LIKE '%linkedin%' OR referer LIKE '%segmentfault%' OR referer LIKE '%cnblogs%' THEN '平台/社交'
       ELSE '外部链接'
     END AS category, COUNT(*) AS pv, COUNT(DISTINCT ip_hash) AS uv
     FROM page_views WHERE bot = '' AND created_at >= ? GROUP BY category ORDER BY pv DESC`,
    [isoDaysAgo(days)],
  )
  return (rows as unknown as SourceStat[]).map((r) => ({ category: r.category, pv: Number(r.pv), uv: Number(r.uv) }))
}

export interface BotStat {
  bot: string
  pv: number
  uv: number
  last: string
  ips: string
}

export async function statsBots(days = 7): Promise<BotStat[]> {
  const rows = await useEngine().all(
    `SELECT bot, COUNT(*) AS pv, COUNT(DISTINCT ip) AS uv, MAX(created_at) AS last, GROUP_CONCAT(ip) AS ips
     FROM page_views WHERE bot <> '' AND created_at >= ? GROUP BY bot ORDER BY pv DESC LIMIT 20`,
    [isoDaysAgo(days)],
  )
  return (rows as unknown as BotStat[]).map((r) => ({
    bot: r.bot,
    pv: Number(r.pv),
    uv: Number(r.uv),
    last: r.last,
    ips: r.ips ?? '',
  }))
}

export interface IpStat {
  ip: string
  views: number
  paths: number
  first: string
  last: string
  referers: string
}

export async function statsByIp(days = 7, limit = 25): Promise<IpStat[]> {
  const rows = await useEngine().all(
    `SELECT ip, COUNT(*) AS views, COUNT(DISTINCT path) AS paths, MIN(created_at) AS first, MAX(created_at) AS last,
            GROUP_CONCAT(CASE WHEN referer = '' THEN '(direct)' ELSE referer END) AS referers
     FROM page_views WHERE bot = '' AND created_at >= ? AND ip <> '' GROUP BY ip ORDER BY views DESC LIMIT ?`,
    [isoDaysAgo(days), limit],
  )
  return (rows as unknown as IpStat[]).map((r) => ({ ...r, views: Number(r.views), paths: Number(r.paths) }))
}

export interface GeoRow {
  ip: string
  country: string
  region: string
  isp: string
}

export async function getIpGeo(ips: string[]): Promise<Map<string, GeoRow>> {
  const map = new Map<string, GeoRow>()
  if (ips.length === 0) return map
  const placeholders = ips.map(() => '?').join(',')
  const rows = await useEngine().all(`SELECT ip, country, region, isp FROM ip_geo WHERE ip IN (${placeholders})`, ips)
  for (const r of rows as unknown as GeoRow[]) map.set(r.ip, r)
  return map
}

export async function saveIpGeo(rows: GeoRow[]): Promise<void> {
  const e = useEngine()
  for (const r of rows) {
    await e.run(
      `INSERT INTO ip_geo (ip, country, region, isp, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET country = excluded.country, region = excluded.region, isp = excluded.isp, updated_at = excluded.updated_at`,
      [r.ip, r.country, r.region, r.isp, nowIso()],
    )
  }
}
