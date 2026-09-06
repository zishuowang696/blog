import { Hono } from 'hono'
import { getPage } from '../lib/db.ts'
import { NotFoundView, renderHtml } from '../templates/layout.tsx'
import { StaticPageView } from '../views/page.tsx'

export const pageRoutes = new Hono()

pageRoutes.get('/about', (c) => {
  const page = getPage('about')
  if (!page) return c.html(renderHtml(c, { title: '404', body: <NotFoundView /> }), 404)
  const body = <StaticPageView page={page} />
  return c.html(renderHtml(c, { title: page.title, active: 'about', body }))
})
