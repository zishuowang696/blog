import { openDb } from '../lib/db.ts'

openDb()
const d = openDb()
const posts = (d.query('SELECT COUNT(*) AS n FROM posts').get() as { n: number }).n
const pages = (d.query('SELECT COUNT(*) AS n FROM pages').get() as { n: number }).n
console.log('db:init ok (schema ensured, foreign_keys on)')
console.log(`  posts in DB : ${posts}`)
console.log(`  pages in DB : ${pages}`)
console.log('  hint: 用 bun run db:import 从 content/archive 灌入种子文章')
