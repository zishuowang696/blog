import { Hono } from 'hono'
import type { Context } from 'hono'
import { listAllPostsMeta, listPosts, listSeries, listTags } from '../lib/db.ts'
import { langHref, resolveLang, t } from '../lib/locale.ts'
import { renderHtml } from '../templates/layout.tsx'
import { SeriesIndexView, SeriesPostsView } from '../views/series.tsx'

function pageNum(c: Context): number {
  const raw = Number(c.req.query('page'))
  return Number.isInteger(raw) && raw > 0 ? raw : 1
}

export const seriesRoutes = new Hono()

seriesRoutes.get('/', async (c) => {
  const lang = resolveLang(c)
  const series = await listSeries()
  const body = <SeriesIndexView series={series} latest={(await listAllPostsMeta()).slice(0, 6)} tags={await listTags()} lang={lang} />
  return c.html(await renderHtml(c, { title: t(lang, 'series.title'), active: 'series', body }))
})

seriesRoutes.get('/:name', async (c) => {
  const lang = resolveLang(c)
  const name = c.req.param('name')
  const page = pageNum(c)
  const list = await listPosts({ page, series: name, lang })
  const base = `/series/${encodeURIComponent(name)}`
  const makeHref = (p: number) => langHref(lang, p === 1 ? base : `${base}?page=${p}`)

  const body = (
    <SeriesPostsView
      name={name}
      posts={list.items}
      page={page}
      totalPages={list.totalPages}
      total={list.total}
      latest={(await listAllPostsMeta()).slice(0, 6)}
      tags={await listTags()}
      allSeries={await listSeries()}
      makeHref={makeHref}
      lang={lang}
    />
  )
  const query = page > 1 ? `?page=${page}` : undefined
  const prev = page > 1 ? makeHref(page - 1) : undefined
  const next = page < list.totalPages ? makeHref(page + 1) : undefined
  return c.html(await renderHtml(c, { title: t(lang, 'series.title_one', { name }), active: 'series', query, prev, next, body }))
})
