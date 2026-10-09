import { Hono } from 'hono'
import { accessLogger, securityHeaders } from './middleware/http.ts'
import { adminRoutes } from './routes/admin.tsx'
import { authRoutes } from './routes/auth.tsx'
import { commentRoutes } from './routes/comments.tsx'
import { homeRoutes } from './routes/home.tsx'
import { langRoutes } from './routes/lang.tsx'
import { postRoutes } from './routes/posts.tsx'
import { tagRoutes } from './routes/tags.tsx'
import { pageRoutes } from './routes/pages.tsx'
import { searchRoutes } from './routes/search.tsx'
import { sitemapRoutes } from './routes/sitemap.ts'
import { resolveLang } from './lib/locale.ts'
import { NotFoundView, renderHtml } from './templates/layout.tsx'

export const app = new Hono()

app.use('*', accessLogger, securityHeaders)

// 根级文件不区分大小写：/Sitemap.xml、/ROBOTS.TXT 等 301 跳到小写规范地址
const ROOT_FILES = new Set(['/sitemap.xml', '/robots.txt', '/llms.txt'])
app.use('*', async (c, next) => {
  const path = c.req.path
  const lower = path.toLowerCase()
  if (path !== lower && ROOT_FILES.has(lower)) {
    return c.redirect(lower + new URL(c.req.url).search, 301)
  }
  await next()
})

// 中文：根路径；英文：/en 前缀（URL 决定语言，便于中英各自被收录）
app.route('/', homeRoutes)
app.route('/posts', postRoutes)
app.route('/tags', tagRoutes)
app.route('/', pageRoutes)
app.route('/search', searchRoutes)
app.route('/', authRoutes)
app.route('/', commentRoutes)

app.route('/en', homeRoutes)
app.route('/en/posts', postRoutes)
app.route('/en/tags', tagRoutes)
app.route('/en', pageRoutes)
app.route('/en/search', searchRoutes)
app.route('/en', authRoutes)
app.route('/en', commentRoutes)

app.route('/lang', langRoutes)
app.route('/', sitemapRoutes)
app.route('/admin', adminRoutes)

app.notFound(async (c) => c.html(await renderHtml(c, { title: '404', body: <NotFoundView lang={resolveLang(c)} /> }), 404))
