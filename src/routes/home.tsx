import { Hono } from 'hono'
import type { Context } from 'hono'
import { listPosts, listRecentPosts, listSeries, listTags } from '../lib/db.ts'
import { langHref, resolveLang, t } from '../lib/locale.ts'
import { renderHtml } from '../templates/layout.tsx'
import { SITE_NAME } from '../templates/util.ts'
import { HomeView } from '../views/home.tsx'

function pageParam(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

export const homeRoutes = new Hono()

homeRoutes.get('/', async (c) => {
  const lang = resolveLang(c)
  const page = pageParam(c)
  const list = await listPosts({ page, lang })
  const makeHref = (p: number) => langHref(lang, p === 1 ? '/' : `/?page=${p}`)

  const body = (
    <HomeView
      posts={list.items}
      page={page}
      totalPages={list.totalPages}
      tags={await listTags()}
      latest={await listRecentPosts(6, lang)}
      series={await listSeries()}
      makeHref={makeHref}
      lang={lang}
    />
  )
  const title = `${SITE_NAME} — ${t(lang, 'home.hero')}`
  const query = page > 1 ? `?page=${page}` : undefined
  const prev = page > 1 ? makeHref(page - 1) : undefined
  const next = page < list.totalPages ? makeHref(page + 1) : undefined
  return c.html(await renderHtml(c, { title, active: 'home', query, prev, next, body }))
})
