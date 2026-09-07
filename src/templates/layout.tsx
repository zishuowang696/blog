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
        <a href="/login">Log in</a>
        <a href="/register">Sign up</a>
      </span>
    )
  }
  return (
    <span class="nav-account">
      <span class="whoami" title={user.username}>
        {user.display_name}
      </span>
      {isAdmin(user) ? <a href="/admin">Console</a> : null}
      <form class="inline" action="/logout" method="post">
        <button class="linkish" type="submit">
          Log out
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
              {nav('home', 'Posts', '/')}
              {nav('tags', 'Tags', '/tags')}
              {nav('about', 'About', '/about')}
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

export function renderHtml(c: Context, opts: PageOpts): Promise<string> {
  return getSessionUser(c).then((user) =>
    '<!doctype html>\n' +
    String(
      <Layout title={opts.title} description={opts.description} active={opts.active} user={user}>
        {opts.body}
      </Layout>,
    ),
  )
}

export function NotFoundView() {
  return (
    <section class="nf">
      <h1>404</h1>
      <p>Page not found, or the article is not published yet.</p>
      <a class="btn" href="/">
        Back to home
      </a>
    </section>
  )
}

export function ForbiddenView() {
  return (
    <section class="nf">
      <h1>403</h1>
      <p>Admin access required.</p>
      <a class="btn" href="/">
        Back to home
      </a>
    </section>
  )
}
