import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    content_html: text('content_html').notNull(),
    source_md: text('source_md').notNull().default(''),
    series: text('series').notNull().default(''),
    published: integer('published').notNull().default(1),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [index('idx_posts_published_date').on(t.published, t.created_at)],
)

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('idx_tags_name').on(t.name)],
)

export const postTags = sqliteTable(
  'post_tags',
  {
    post_id: integer('post_id').notNull(),
    tag_id: integer('tag_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.post_id, t.tag_id] }), index('idx_post_tags_tag').on(t.tag_id)],
)

export const pages = sqliteTable('pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  content_html: text('content_html').notNull(),
  source_md: text('source_md').notNull().default(''),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().default(''),
  display_name: text('display_name').notNull(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
})

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    token: text('token').notNull().unique(),
    user_id: integer('user_id').notNull(),
    expires_at: text('expires_at').notNull(),
    created_at: text('created_at').notNull(),
  },
  (t) => [index('idx_sessions_token').on(t.token), index('idx_sessions_expiry').on(t.expires_at)],
)

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    post_slug: text('post_slug').notNull(),
    user_id: integer('user_id').notNull(),
    body: text('body').notNull(),
    created_at: text('created_at').notNull(),
  },
  (t) => [index('idx_comments_post').on(t.post_slug, t.created_at)],
)
