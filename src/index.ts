import { app } from './app.tsx'
import { openDb } from './lib/db.ts'
import { SITE_NAME } from './templates/util.ts'

openDb()

const port = Number(Bun.env.PORT ?? 3000)
const host = Bun.env.HOST ?? '0.0.0.0'

const server = Bun.serve({
  hostname: host,
  port,
  fetch: app.fetch,
  idleTimeout: 60,
})

console.log(`${SITE_NAME} running at http://${host === '0.0.0.0' ? 'localhost' : host}:${server.port}`)
