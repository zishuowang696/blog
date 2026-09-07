import { Hono } from 'hono'
import { getPage } from '../lib/db.ts'
import { resolveLang } from '../lib/locale.ts'
import { NotFoundView, renderHtml } from '../templates/layout.tsx'
import { StaticPageView } from '../views/page.tsx'

export const pageRoutes = new Hono()

pageRoutes.get('/about', async (c) => {
  const page = await getPage('about')
  if (!page) return c.html(await renderHtml(c, { title: '404', body: <NotFoundView lang={resolveLang(c)} /> }), 404)
  const body = <StaticPageView page={page} />
  return c.html(await renderHtml(c, { title: page.title, active: 'about', body }))
})
