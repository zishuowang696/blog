import { serveStatic } from 'hono/bun'
import { join } from 'node:path'
import { app } from './app.tsx'
import { initLocalDb, rootDir } from './lib/engine/sqlite.ts'
import { SITE_NAME } from './templates/util.ts'

const publicRoot = join(rootDir, 'public')
for (const prefix of ['/css', '/js', '/vendor', '/img']) {
  app.use(`${prefix}/*`, serveStatic({ root: publicRoot }))
}
app.get('/favicon.svg', serveStatic({ root: publicRoot }))
app.get('/robots.txt', serveStatic({ root: publicRoot }))

await initLocalDb()

const port = Number(Bun.env.PORT ?? 3000)
const host = Bun.env.HOST ?? '0.0.0.0'

const server = Bun.serve({
  hostname: host,
  port,
  fetch: app.fetch,
  idleTimeout: 60,
})

console.log(`${SITE_NAME} running at http://${host === '0.0.0.0' ? 'localhost' : host}:${server.port}`)
