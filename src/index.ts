import { app } from './app.tsx'
import { openDb, syncContent } from './lib/db.ts'
import { SITE_NAME } from './templates/util.ts'

openDb()
const result = syncContent()
console.log(
  `[content] posts: ${result.upsertedPosts} synced${result.unpublishedPosts ? `, ${result.unpublishedPosts} unpublished` : ''}; pages: ${result.upsertedPages}`,
)

const port = Number(Bun.env.PORT ?? 3000)
const host = Bun.env.HOST ?? '0.0.0.0'

const server = Bun.serve({
  hostname: host,
  port,
  fetch: app.fetch,
  idleTimeout: 60,
})

console.log(`${SITE_NAME} running at http://${host === '0.0.0.0' ? 'localhost' : host}:${server.port}`)
