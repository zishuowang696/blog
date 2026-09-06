import { useEngine } from '../lib/engine.ts'
import { initLocalDb } from '../lib/engine/sqlite.ts'

await initLocalDb()
const e = useEngine()
const posts = Number((await e.first('SELECT COUNT(*) AS n FROM posts'))?.n ?? 0)
const pages = Number((await e.first('SELECT COUNT(*) AS n FROM pages'))?.n ?? 0)
console.log('db:init ok (schema ensured, foreign_keys on)')
console.log(`  posts in DB : ${posts}`)
console.log(`  pages in DB : ${pages}`)
console.log('  hint: 用 bun run db:import 从 content/archive 灌入种子文章')
