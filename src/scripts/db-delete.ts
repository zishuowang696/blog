import { initLocalDb } from '../lib/engine/sqlite.ts'
import { deletePost } from '../lib/db.ts'

await initLocalDb()
const slugs = process.argv.slice(2)
if (slugs.length === 0) {
  console.error('用法: bun src/scripts/db-delete.ts <slug> [slug...]')
  process.exit(1)
}
for (const slug of slugs) {
  const ok = await deletePost(slug)
  console.log(`${slug}: ${ok ? 'deleted' : 'not found'}`)
}
