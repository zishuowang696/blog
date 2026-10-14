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

// 其它静态页（如 /tools）：存在就渲染，否则交给后续路由
pageRoutes.get('/:slug', async (c, next) => {
  const page = await getPage(c.req.param('slug'))
  if (!page) return next()
  const body = <StaticPageView page={page} />
  return c.html(await renderHtml(c, { title: page.title, body }))
})
