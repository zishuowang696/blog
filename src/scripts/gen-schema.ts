import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..', '..')
const src = readFileSync(join(root, 'db', 'schema.sql'), 'utf8')
const escaped = src.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
const out = `// 自动生成自 db/schema.sql，勿手改；结构变更请改 db/schema.sql 后运行 bun run schema:gen
export const SCHEMA_SQL = \`${escaped}\`
`
writeFileSync(join(root, 'src', 'lib', 'schema.ts'), out)
console.log('schema.ts 已从 db/schema.sql 重新生成')
