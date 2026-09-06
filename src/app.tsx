import { Hono } from 'hono'
import { accessLogger, securityHeaders } from './middleware/http.ts'
import { adminRoutes } from './routes/admin.tsx'
import { authRoutes } from './routes/auth.tsx'
import { commentRoutes } from './routes/comments.tsx'
import { homeRoutes } from './routes/home.tsx'
import { postRoutes } from './routes/posts.tsx'
import { tagRoutes } from './routes/tags.tsx'
import { pageRoutes } from './routes/pages.tsx'
import { searchRoutes } from './routes/search.tsx'
import { sitemapRoutes } from './routes/sitemap.ts'
import { NotFoundView, renderHtml } from './templates/layout.tsx'

export const app = new Hono()

app.use('*', accessLogger, securityHeaders)

app.route('/', homeRoutes)
app.route('/posts', postRoutes)
app.route('/tags', tagRoutes)
app.route('/', pageRoutes)
app.route('/search', searchRoutes)
app.route('/', sitemapRoutes)
app.route('/', authRoutes)
app.route('/', commentRoutes)
app.route('/admin', adminRoutes)

app.notFound(async (c) => c.html(await renderHtml(c, { title: '404', body: <NotFoundView /> }), 404))
