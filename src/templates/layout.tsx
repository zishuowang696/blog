import type { Context } from 'hono'
import type { Child } from 'hono/jsx'
import type { User } from '../lib/db.ts'
import { getSessionUser, isAdmin } from '../lib/auth.ts'
import { SITE_DESC, SITE_NAME } from './util.ts'

export type NavKey = 'home' | 'tags' | 'about' | 'console' | ''

function AccountArea({ user }: { user: User | null }) {
  if (!user) {
    return (
      <span class="nav-account">
        <a href="/login">登录</a>
        <a href="/register">注册</a>
      </span>
    )
  }
  return (
    <span class="nav-account">
      <span class="whoami" title={user.username}>
        {user.display_name}
      </span>
      {isAdmin(user) ? <a href="/admin">控制台</a> : null}
      <form class="inline" action="/logout" method="post">
        <button class="linkish" type="submit">
          退出
        </button>
      </form>
    </span>
  )
}

interface LayoutProps {
  title: string
  description?: string
  active?: NavKey
  user: User | null
  children?: Child
}

export function Layout({ title, description, active, user, children }: LayoutProps) {
  const docTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`
  const nav = (key: NavKey, label: string, href: string) => (
    <a href={href} aria-current={active === key ? 'page' : undefined}>
      {label}
    </a>
  )
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description ?? SITE_DESC} />
        <title>{docTitle}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/css/style.css" />
        <script src="/vendor/htmx.min.js" defer />
      </head>
      <body>
        <header class="site-header">
          <div class="container nav">
            <a class="logo" href="/">
              {SITE_NAME}
            </a>
            <nav class="nav-links">
              {nav('home', '文章', '/')}
              {nav('tags', '标签', '/tags')}
              {nav('about', '关于', '/about')}
              <AccountArea user={user} />
            </nav>
          </div>
        </header>
        <main class="container main">{children}</main>
        <footer class="site-footer">
          <div class="container foot">
            <span>© {new Date().getFullYear()} {SITE_NAME}</span>
            <span class="muted">Bun · Hono · htmx · SQLite</span>
          </div>
        </footer>
      </body>
    </html>
  )
}

export interface PageOpts {
  title: string
  description?: string
  active?: NavKey
  body: Child
}

export function renderHtml(c: Context, opts: PageOpts): string {
  const user = getSessionUser(c)
  return (
    '<!doctype html>\n' +
    String(
      <Layout title={opts.title} description={opts.description} active={opts.active} user={user}>
        {opts.body}
      </Layout>,
    )
  )
}

export function NotFoundView() {
  return (
    <section class="nf">
      <h1>404</h1>
      <p>页面不存在或文章尚未发布。</p>
      <a class="btn" href="/">
        返回首页
      </a>
    </section>
  )
}

export function ForbiddenView() {
  return (
    <section class="nf">
      <h1>403</h1>
      <p>需要管理员权限。</p>
      <a class="btn" href="/">
        返回首页
      </a>
    </section>
  )
}
