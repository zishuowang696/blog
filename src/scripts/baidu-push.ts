// 发布后把 URL 主动推送给百度（搜索资源平台「普通收录 → API 提交」）。
// 用法：
//   bun run baidu:push            # 推送全部已发布文章（中英）+ 首页/标签/关于
//   bun run baidu:push <slug>...  # 只推送指定文章
// 需要环境变量 BAIDU_PUSH_TOKEN（token 见 站长平台 → 普通收录 → API提交）。
import { initLocalDb } from '../lib/engine/sqlite.ts'
import { listAllPostsMeta } from '../lib/db.ts'
import { envStr } from '../lib/env.ts'

const site = (envStr('SITE_URL') ?? 'https://embedai.com.cn').replace(/\/+$/, '')
const token = envStr('BAIDU_PUSH_TOKEN')
if (!token) {
  console.error('缺少环境变量 BAIDU_PUSH_TOKEN（百度搜索资源平台 → 普通收录 → API提交）')
  process.exit(1)
}

await initLocalDb()
const posts = await listAllPostsMeta()
const slugs = process.argv.slice(2)
const picked = slugs.length > 0 ? posts.filter((p) => slugs.includes(p.slug)) : posts

const urls = [
  `${site}/`,
  `${site}/tags`,
  `${site}/about`,
  ...picked.flatMap((p) => [`${site}/posts/${p.slug}`, `${site}/en/posts/${p.slug}`]),
]

const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: urls.join('\n'),
})

console.log(`推送 ${urls.length} 条 -> HTTP ${res.status}`)
console.log(await res.text())
if (!res.ok) process.exit(1)
