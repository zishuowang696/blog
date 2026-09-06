import { syncContent } from '../lib/db.ts'
import { SITE_NAME } from '../templates/util.ts'

const result = syncContent()
console.log(`db:init done for ${SITE_NAME}`)
console.log(`  posts upserted      : ${result.upsertedPosts}`)
console.log(`  posts unpublished   : ${result.unpublishedPosts}`)
console.log(`  pages upserted      : ${result.upsertedPages}`)
console.log(`  pages removed       : ${result.removedPages}`)
console.log('  sqlite file         : db/blog.sqlite')
