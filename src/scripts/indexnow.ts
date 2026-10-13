// 发布后把 URL 秒提交给 IndexNow（Bing 等即时抓取）。
// 用法：
//   bun run indexnow            # 提交全部已发布文章（中英）+ 首页/标签/系列/关于
//   bun run indexnow <slug>...  # 只提交指定文章
// key 公钥文件需可访问：public/<INDEXNOW_KEY>.txt（内容即 key 本身）
import { initLocalDb } from '../lib/engine/sqlite.ts'
import { listAllPostsMeta } from '../lib/db.ts'
import { envStr } from '../lib/env.ts'

const site = (envStr('SITE_URL') ?? 'https://embedai.com.cn').replace(/\/+$/, '')
const key = envStr('INDEXNOW_KEY') ?? '178a0fe0c077b139a7c814b66ef9b18c'
const host = new URL(site).host

await initLocalDb()
const posts = await listAllPostsMeta()
const slugs = process.argv.slice(2)
const picked = slugs.length > 0 ? posts.filter((p) => slugs.includes(p.slug)) : posts

const urls = [
  `${site}/`,
  `${site}/tags`,
  `${site}/series`,
  `${site}/about`,
  ...picked.flatMap((p) => [`${site}/posts/${p.slug}`, `${site}/en/posts/${p.slug}`]),
]

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: urls }),
})
console.log(`IndexNow 提交 ${urls.length} 条 -> HTTP ${res.status}`)
console.log(await res.text())
if (!res.ok && res.status !== 202) process.exit(1)
