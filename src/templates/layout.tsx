import type { Context } from 'hono'
import type { Child } from 'hono/jsx'
import type { User } from '../lib/db.ts'
import { getSessionUser, isAdmin } from '../lib/auth.ts'
import { resolveLang, stripLang, t, EN_PREFIX, langHref, type Lang } from '../lib/locale.ts'
import { SITE_DESC, SITE_NAME } from './util.ts'
import { envStr } from '../lib/env.ts'

export type NavKey = 'home' | 'tags' | 'series' | 'about' | 'console' | ''

const LOGO_MARK = (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect x="8" y="8" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2" />
    <g stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <path d="M12 8V4.5M16 8V4.5M20 8V4.5M12 24v3.5M16 24v3.5M20 24v3.5M8 12H4.5M8 16H4.5M8 20H4.5M24 12h3.5M24 16h3.5M24 20h3.5" />
    </g>
    <g stroke="currentColor" stroke-width="1.4">
      <path d="M16 16 12.5 12.5M16 16l3.5-3.5M16 16l-3.5 3.5M16 16l3.5 3.5" />
    </g>
    <g fill="currentColor">
      <circle cx="16" cy="16" r="2.3" />
      <circle cx="11.5" cy="11.5" r="1.5" />
      <circle cx="20.5" cy="11.5" r="1.5" />
      <circle cx="11.5" cy="20.5" r="1.5" />
      <circle cx="20.5" cy="20.5" r="1.5" />
    </g>
  </svg>
)

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const THEME_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
  </svg>
)

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
  query?: string
  prev?: string
  next?: string
  ogType?: string
  jsonLd?: Record<string, unknown>[]
  children?: Child
}

export function Layout({ title, description, active, user, lang, path, query, prev, next, ogType, jsonLd, children }: LayoutProps) {
  const q = query ?? ''
  const docTitle = title.startsWith(SITE_NAME) ? title : `${title} · ${SITE_NAME}`
  const siteUrl = (envStr('SITE_URL') ?? 'http://localhost:3000').replace(/\/+$/, '')
  const canonical = siteUrl + path + q
  const pageDesc = description ?? SITE_DESC
  const ld: Record<string, unknown>[] = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, description: SITE_DESC, url: siteUrl, inLanguage: lang },
    ...(jsonLd ?? []),
  ]
  const nav = (key: NavKey, label: string, href: string) => (
    <a href={href} aria-current={active === key ? 'page' : undefined}>
      {label}
    </a>
  )
  const switchLabel = t(lang, lang === 'zh' ? 'acct.to_en' : 'acct.to_zh')
  const otherLang: Lang = lang === 'zh' ? 'en' : 'zh'
  const switchHref = langHref(otherLang, stripLang(path))
  const basePath = stripLang(path)
  const zhUrl = siteUrl + basePath + q
  const enUrl = siteUrl + (basePath === '/' ? EN_PREFIX : EN_PREFIX + basePath) + q
  return (
    <html lang={lang}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        <meta name="description" content={pageDesc} />
        <title>{docTitle}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="canonical" href={canonical} />
        {prev ? <link rel="prev" href={prev.startsWith('http') ? prev : siteUrl + prev} /> : null}
        {next ? <link rel="next" href={next.startsWith('http') ? next : siteUrl + next} /> : null}
        <link rel="alternate" hreflang="zh-CN" href={zhUrl} />
        <link rel="alternate" hreflang="en" href={enUrl} />
        <link rel="alternate" hreflang="x-default" href={zhUrl} />
        <link rel="alternate" type="application/rss+xml" title={SITE_NAME} href={langHref(lang, '/feed.xml')} />
        <meta name="msvalidate.01" content="A6BA56FB366CE57CB2410A2B115268A6" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content={ogType ?? 'website'} />
        <meta property="og:title" content={docTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
        <meta name="twitter:card" content="summary" />
        <script src="/vendor/htmx.min.js" defer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </head>
      <body>
        <header class="site-header">
          <div class="container nav">
            <a class="logo" href={langHref(lang, '/')}>
              <span class="logo-mark">{LOGO_MARK}</span>
              <span class="logo-text">{SITE_NAME}</span>
            </a>
            <nav class="nav-main">
              {nav('home', t(lang, 'nav.posts'), langHref(lang, '/'))}
              {nav('tags', t(lang, 'nav.tags'), langHref(lang, '/tags'))}
              {nav('series', t(lang, 'nav.series'), langHref(lang, '/series'))}
              {nav('about', t(lang, 'nav.about'), langHref(lang, '/about'))}
            </nav>
            <div class="header-actions">
              <a class="icon-search" href={langHref(lang, '/search')} aria-label={t(lang, 'search.title')} title={t(lang, 'search.title')}>
                {SEARCH_ICON}
              </a>
              <span class="lang-switch">
                <a href={switchHref}>{switchLabel}</a>
              </span>
              <button type="button" class="theme-toggle" id="theme-toggle" aria-label={t(lang, 'ui.theme')} title={t(lang, 'ui.theme')}>
                {THEME_ICON}
              </button>
              <AccountArea user={user} lang={lang} />
            </div>
          </div>
        </header>
        <main class="container main">{children}</main>
        <footer class="site-footer">
          <div class="container">
            <div class="foot-cols">
              <div>
                <a class="logo" href={langHref(lang, '/')}>
                  <span class="logo-mark">{LOGO_MARK}</span>
                  <span class="logo-text">{SITE_NAME}</span>
                </a>
                <p class="foot-desc">{SITE_DESC}</p>
              </div>
              <div>
                <h4>{t(lang, 'nav.posts')}</h4>
                <a href={langHref(lang, '/')}>{t(lang, 'nav.posts')}</a>
                <a href={langHref(lang, '/tags')}>{t(lang, 'nav.tags')}</a>
                <a href={langHref(lang, '/about')}>{t(lang, 'nav.about')}</a>
              </div>
              <div>
                <h4>{lang === 'zh' ? '更多' : 'More'}</h4>
                <a href={langHref(lang, '/feed.xml')}>RSS</a>
                <a href={langHref(lang, '/sitemap.xml')}>Sitemap</a>
                <a href={langHref(lang, '/llms.txt')}>llms.txt</a>
                <a href="https://github.com/zishuowang696" target="_blank" rel="noopener">GitHub</a>
              </div>
            </div>
            <div class="foot-bottom">
              <span>
                © {new Date().getFullYear()} {SITE_NAME}
              </span>
              <span class="muted">Bun · Hono · htmx · SQLite</span>
            </div>
          </div>
        </footer>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var b=document.getElementById('theme-toggle');if(!b)return;b.addEventListener('click',function(){var d=document.documentElement.getAttribute('data-theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches;var cur=d||(s?'dark':'light');var nx=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',nx);try{localStorage.setItem('theme',nx)}catch(e){}})})()",
          }}
        />
      </body>
    </html>
  )
}

export interface PageOpts {
  title: string
  description?: string
  active?: NavKey
  query?: string
  prev?: string
  next?: string
  ogType?: string
  jsonLd?: Record<string, unknown>[]
  body: Child
}

export function renderHtml(c: Context, opts: PageOpts): Promise<string> {
  const lang = resolveLang(c)
  const path = new URL(c.req.url).pathname
  return getSessionUser(c).then((user) =>
    '<!doctype html>\n' +
    String(
      <Layout
        title={opts.title}
        description={opts.description}
        active={opts.active}
        query={opts.query}
        prev={opts.prev}
        next={opts.next}
        ogType={opts.ogType}
        jsonLd={opts.jsonLd}
        user={user}
        lang={lang}
        path={path}
      >
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
      <a class="btn" href={langHref(lang, '/')}>
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
      <a class="btn" href={langHref(lang, '/')}>
        {t(lang, 'ui.back_home')}
      </a>
    </section>
  )
}
