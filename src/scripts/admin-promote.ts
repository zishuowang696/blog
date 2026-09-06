import { getUserByUsername, setUserRole } from '../lib/db.ts'

const name = (process.argv[2] ?? '').trim().toLowerCase()
if (!name) {
  console.error('用法：bun run db:promote <用户名>')
  process.exit(1)
}
const user = getUserByUsername(name)
if (!user) {
  console.error(`用户不存在：${name}`)
  process.exit(1)
}
setUserRole(user.id, 'admin')
console.log(`已将 ${user.username} 提升为管理员`)
