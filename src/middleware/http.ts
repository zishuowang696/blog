import type { MiddlewareHandler } from 'hono'
import { recordView } from '../lib/db.ts'

const safe = (s: string | undefined): string => s ?? '-'

export const accessLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now()
  await next()
  const ms = Math.round(performance.now() - start)
  const ua = c.req.header('user-agent')?.slice(0, 80) ?? '-'
  console.log(
    `${new Date().toISOString()} ${c.req.method} ${c.req.path} -> ${c.res.status} ${ms}ms hx=${c.req.header('hx-request') ?? '-'} ip=${safe(c.req.header('x-forwarded-for'))} ua="${ua}"`,
  )
}

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'same-origin')
  c.header('X-Frame-Options', 'DENY')
}

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const SENSITIVE = /^(?:\/en)?\/(login|register)$/
const rateHits = new Map<string, { count: number; reset: number }>()

const clientIp = (c: { req: { header: (n: string) => string | undefined } }): string => {
  const cf = c.req.header('cf-connecting-ip')
  if (cf) return cf
  const first = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
  return first || 'unknown'
}

export const rateLimitSensitive: MiddlewareHandler = async (c, next) => {
  if (!SENSITIVE.test(c.req.path)) return next()
  const ip = clientIp(c)
  const now = Date.now()
  const rec = rateHits.get(ip)
  if (!rec || now > rec.reset) {
    rateHits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS })
  } else if (++rec.count > RATE_MAX) {
    c.header('Retry-After', String(Math.ceil((rec.reset - now) / 1000)))
    return c.text('Too Many Requests', 429)
  }
  if (rateHits.size > 5000) {
    for (const [k, v] of rateHits) if (now > v.reset) rateHits.delete(k)
  }
  await next()
}

const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|baidu|yandex|duckduck|facebook|externalhit|headless|phantomjs|python|curl|wget|okhttp|axios|go-http|java\/|libwww|node-fetch|undici|monitor|uptime|pingdom|statuscake|site24|gtmetrix|lighthouse|zabbix|nagios|censys|shodan|zgrab|netcraft|bitsight|expanse|binaryedge|securityscorecard|netsystemsresearch|internet-measurement|builtwith|dataprovider|datanyze|similarweb|screaming|petal|nmap|masscan|scan/i

const BOT_NAMES: [RegExp, string][] = [
  [/googlebot|apis-google|google/i, 'Googlebot'],
  [/bingbot|bingpreview|bing/i, 'Bingbot'],
  [/baiduspider|baidu/i, 'Baiduspider'],
  [/yandex/i, 'YandexBot'],
  [/sogou/i, 'Sogou'],
  [/bytespider/i, 'Bytespider'],
  [/duckduck/i, 'DuckDuckBot'],
  [/facebook|externalhit/i, 'facebookexternalhit'],
  [/semrush|ahrefs|mj12|dotbot|petal|gptbot|claudebot|ccbot|perplexity|applebot|slurp/i, 'SEO/AI 爬虫'],
  [/builtwith|dataprovider|datanyze|similarweb|screaming|opensiteexplorer/i, '营销数据爬虫'],
  [/censys|shodan|zgrab|netcraft|bitsight|expanse|binaryedge|securityscorecard|netsystemsresearch|internet-measurement/i, '安全扫描'],
  [/uptime|pingdom|statuscake|site24|gtmetrix|lighthouse|zabbix|nagios|monitor/i, '监控'],
  [/python|curl|wget|okhttp|axios|go-http|java\/|libwww|node-fetch|undici|headless|phantomjs/i, '脚本/扫描'],
]

export function botName(ua: string): string {
  if (!BOT_RE.test(ua)) return ''
  for (const [re, name] of BOT_NAMES) if (re.test(ua)) return name
  return '其他爬虫'
}

// 行为级反爬：同一 IP 在一个窗口内访问大量「不同」路径 → 判为爬虫（UA 可被伪装绕过）。
// 只影响统计归类，不拦截任何请求；有 UA 名的搜索引擎优先走 botName，不会被这里覆盖。
const CRAWL_WINDOW_MS = 1_800_000
const CRAWL_MAX_PATHS = 50
const CRAWL_MAP_LIMIT = 5000
const crawlSeen = new Map<string, { t: number; p: string }[]>()

export function isCrawlerByBehavior(ip: string, path: string, now: number = Date.now()): boolean {
  const cutoff = now - CRAWL_WINDOW_MS
  const rec = (crawlSeen.get(ip) ?? []).filter((e) => e.t > cutoff)
  rec.push({ t: now, p: path })
  if (rec.length > 300) rec.splice(0, rec.length - 300)
  crawlSeen.set(ip, rec)
  if (crawlSeen.size > CRAWL_MAP_LIMIT) {
    for (const [k, v] of crawlSeen) if (v.every((e) => e.t <= cutoff)) crawlSeen.delete(k)
  }
  return new Set(rec.map((e) => e.p)).size >= CRAWL_MAX_PATHS
}
const SKIP_PREFIX = ['/admin', '/css', '/vendor', '/lang', '/.well-known']
const SKIP_EXT = /\.(css|js|mjs|svg|ico|png|jpe?g|gif|webp|avif|xml|txt|json|map|woff2?)$/i
const STATS_SALT = 'embedai-stats-v1'

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${STATS_SALT}|${ip}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 记录真人页面访问（仅 HTML GET，跳过机器人/静态/后台）；IP 只存哈希，仅管理员可见。
export const trackViews: MiddlewareHandler = async (c, next) => {
  await next()
  if (c.req.method !== 'GET' || c.res.status !== 200) return
  const path = c.req.path
  const lower = path.toLowerCase()
  if (SKIP_PREFIX.some((p) => lower === p || lower.startsWith(`${p}/`)) || SKIP_EXT.test(lower)) return
  if (!(c.res.headers.get('content-type') ?? '').includes('text/html')) return
  // 已登录（通常是你自己）或主动标记 nv=1 的浏览器，不计入，避免自访问污染统计
  const cookie = c.req.header('cookie') ?? ''
  if (cookie.includes('sid=') || cookie.includes('nv=1')) return
  const ua = c.req.header('user-agent') ?? ''
  if (!ua) return
  const ip = clientIp(c)
  const bot = botName(ua) || (isCrawlerByBehavior(ip, path) ? '爬虫(行为)' : '')
  try {
    await recordView({
      path,
      ip,
      ipHash: await hashIp(ip),
      bot,
      referer: c.req.header('referer') ?? '',
      ua,
    })
  } catch {
    // 统计失败绝不影响正常访问
  }
}
