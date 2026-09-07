import type { Context } from 'hono'
import type { Child } from 'hono/jsx'
import type { User } from '../lib/db.ts'
import { getSessionUser, isAdmin } from '../lib/auth.ts'
import { resolveLang, t, type Lang } from '../lib/locale.ts'
import { SITE_DESC, SITE_NAME } from './util.ts'

export type NavKey = 'home' | 'tags' | 'about' | 'console' | ''

function AccountArea({ user, lang }: { user: User | null; lang: Lang }) {
  if (!user) {
    return (
      <span class="nav-account">
        <a href="/login">{t(lang, 'acct.login')}</a>
        <a href="/register">{t(lang, 'acct.signup')}</a>
      </span>
    )
  }
  return (
    <span class="nav-account">
      <span class="whoami" title={user.username}>
        {user.display_name}
      </span>
      {isAdmin(user) ? <a href="/admin">{t(lang, 'nav.console')}</a> : null}
      <form class="inline" action="/logout" method="post">
        <button class="linkish" type="submit">
          {t(lang, 'acct.logout')}
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
  lang: Lang
  path: string
  children?: Child
}

export function Layout({ title, description, active, user, lang, path, children }: LayoutProps) {
  const docTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`
  const nav = (key: NavKey, label: string, href: string) => (
    <a href={href} aria-current={active === key ? 'page' : undefined}>
      {label}
    </a>
  )
  const switchLabel = t(lang, lang === 'zh' ? 'acct.to_en' : 'acct.to_zh')
  const switchHref = `/lang?lang=${lang === 'zh' ? 'en' : 'zh'}&next=${encodeURIComponent(path)}`
  return (
    <html lang={lang}>
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
              {nav('home', t(lang, 'nav.posts'), '/')}
              {nav('tags', t(lang, 'nav.tags'), '/tags')}
              {nav('about', t(lang, 'nav.about'), '/about')}
              <span class="lang-switch">
                <a href={switchHref}>{switchLabel}</a>
              </span>
              <AccountArea user={user} lang={lang} />
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
  const lang = resolveLang(c)
  const path = new URL(c.req.url).pathname
  return getSessionUser(c).then((user) =>
    '<!doctype html>\n' +
    String(
      <Layout title={opts.title} description={opts.description} active={opts.active} user={user} lang={lang} path={path}>
        {opts.body}
      </Layout>,
    ),
  )
}

export function NotFoundView({ lang }: { lang: Lang }) {
  return (
    <section class="nf">
      <h1>404</h1>
      <p>{t(lang, 'nf.msg')}</p>
      <a class="btn" href="/">
        {t(lang, 'ui.back_home')}
      </a>
    </section>
  )
}

export function ForbiddenView({ lang }: { lang: Lang }) {
  return (
    <section class="nf">
      <h1>403</h1>
      <p>{t(lang, 'nf.forbidden')}</p>
      <a class="btn" href="/">
        {t(lang, 'ui.back_home')}
      </a>
    </section>
  )
}
