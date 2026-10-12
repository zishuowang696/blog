
import type { DayStat, PageMeta, PathStat, PostMeta, RecentView, RefererStat, SourceStat, StatsOverview } from '../lib/db.ts'
import type { PageInput, PostInput } from '../lib/content.ts'
import { renderMarkdown } from '../lib/md.ts'
import { fmtDate } from '../templates/util.ts'

type AdminTab = 'list' | 'new' | 'import' | 'pages' | 'stats'

function AdminNav({ active }: { active: AdminTab }) {
  const tabs: { key: AdminTab; label: string; href: string }[] = [
    { key: 'list', label: '文章管理', href: '/admin' },
    { key: 'new', label: '写新文章', href: '/admin/new' },
    { key: 'import', label: '导入 Markdown', href: '/admin/import' },
    { key: 'pages', label: '静态页面', href: '/admin/pages' },
    { key: 'stats', label: '访问统计', href: '/admin/stats' },
  ]
  return (
    <>
      <p class="crumbs">
        <a href="/">← 返回站点</a>
      </p>
      <header class="page-head">
        <h1>写作控制台</h1>
      </header>
      <nav class="tabs">
        {tabs.map((t) => (
          <a href={t.href} aria-current={active === t.key ? 'page' : undefined}>
            {t.label}
          </a>
        ))}
      </nav>
    </>
  )
}

export function AdminListView({ rows }: { rows: PostMeta[] }) {
  return (
    <>
      <AdminNav active="list" />
      {rows.length === 0 ? (
        <p class="empty">暂无文章，点「写新文章」开始，或「导入 Markdown」批量灌入。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>日期</th>
              <th>标签</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.slug}>
                <td>
                  <a href={`/posts/${p.slug}`}>{p.title}</a>
                  {p.published ? null : <span class="badge">草稿</span>}
                </td>
                <td>{fmtDate(p.date)}</td>
                <td>{p.tags.join(', ')}</td>
                <td>
                  <div class="row-actions">
                    <a class="btn ghost small" href={`/admin/${p.slug}/edit`}>
                      编辑
                    </a>
                    <form
                      class="inline"
                      action={`/admin/${p.slug}/delete`}
                      method="post"
                      {...{ 'hx-confirm': '确认删除这篇及其评论？' }}
                    >
                      <button class="btn ghost danger small" type="submit">
                        删除
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export function AdminEditorView({
  post,
  action,
  heading,
  slugLocked,
  error,
}: {
  post: PostInput
  action: string
  heading: string
  slugLocked: boolean
  error?: string
}) {
  return (
    <>
      <AdminNav active="list" />
      <section class="editor-card">
        <form action={action} method="post">
          {error ? <p class="flash error">{error}</p> : null}
          <h2>{heading}</h2>
          <label>
            标题
            <input type="text" name="title" value={post.title} required maxlength={120} />
          </label>
          <label>
            日期
            <input type="date" name="date" value={post.date} required />
          </label>
          <label>
            文件名（slug，编辑时不可改）
            <input type="text" name="slug" value={post.slug} required pattern="[a-z0-9][a-z0-9-]*" readOnly={slugLocked} />
          </label>
          <label>
            标签（英文逗号分隔）
            <input type="text" name="tags" value={post.tags.join(', ')} placeholder="openwrt, yocto, ai网关" />
          </label>
          <label>
            摘要
            <input type="text" name="summary" value={post.summary} maxlength={300} />
          </label>
          <label>
            系列（可选）
            <input type="text" name="series" value={post.series} maxlength={60} placeholder="如 AI 网关实战" />
          </label>
          <label>
            正文（Markdown）
            <textarea name="body" rows={18} required>
              {post.body}
            </textarea>
          </label>
          <h2 class="en-block">English version（可选；留空则访问者回退中文）</h2>
          <label>
            English title
            <input type="text" name="title_en" value={post.title_en ?? ''} maxlength={160} />
          </label>
          <label>
            English summary
            <input type="text" name="summary_en" value={post.summary_en ?? ''} maxlength={300} />
          </label>
          <label>
            English body (Markdown)
            <textarea name="body_en" rows={18}>
              {post.body_en ?? ''}
            </textarea>
          </label>
          <label class="check">
            <input type="checkbox" name="published" value="1" checked={post.published} /> 发布（不勾选为草稿，前台不可见）
          </label>
          <div class="form-actions">
            <button class="btn" type="submit">
              保存
            </button>
            <a class="btn ghost" href="/admin">
              取消
            </a>
          </div>
        </form>
        <div class="admin-preview">
          <h3>预览</h3>
          <div class="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
        </div>
      </section>
    </>
  )
}

export interface ImportResult {
  slug: string
  title: string
  status: 'ok' | 'error'
  message: string
}

export function AdminImportView({ results }: { results?: ImportResult[] }) {
  const table = results && results.length > 0 ? (
    <table class="admin-table result-table">
      <thead>
        <tr>
          <th>文件</th>
          <th>标题</th>
          <th>结果</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => (
          <tr key={i}>
            <td>{r.slug}.md</td>
            <td>{r.title}</td>
            <td class={r.status === 'ok' ? 'ok' : 'err'}>
              {r.status === 'ok' ? '已导入' : r.message}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : null
  return (
    <>
      <AdminNav active="import" />
      <section class="import-card">
        <h2>导入 Markdown 文章</h2>
        <p class="muted">
          选择你本地写好的 .md 文件（可多选）。文件名即 slug；若 slug 已存在则用新内容<strong>覆盖</strong>。
          frontmatter 含 title / date / tags / summary / series / published。
        </p>
        <form action="/admin/import" method="post" enctype="multipart/form-data">
          <input type="file" name="files" accept=".md,text/markdown" multiple required />
          <button class="btn" type="submit">
            开始导入
          </button>
        </form>
      </section>
      {table}
    </>
  )
}

export function AdminPagesView({ pages }: { pages: PageMeta[] }) {
  return (
    <>
      <AdminNav active="pages" />
      <p class="muted">静态页面同样以数据库为源，可编辑 /about 等页面的正文。</p>
      {pages.length === 0 ? (
        <p class="empty">暂无静态页面。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>页面</th>
              <th>路径</th>
              <th>日期</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((pg) => (
              <tr key={pg.slug}>
                <td>{pg.title}</td>
                <td>
                  <a href={`/${pg.slug}`}>/{pg.slug}</a>
                </td>
                <td>{fmtDate(pg.date)}</td>
                <td>
                  <a class="btn ghost small" href={`/admin/pages/${pg.slug}/edit`}>
                    编辑
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

export function AdminPageEditorView({
  page,
  action,
  error,
}: {
  page: PageInput
  action: string
  error?: string
}) {
  return (
    <>
      <AdminNav active="pages" />
      <section class="editor-card">
        <form action={action} method="post">
          {error ? <p class="flash error">{error}</p> : null}
          <h2>编辑页面：/{page.slug}</h2>
          <label>
            标题
            <input type="text" name="title" value={page.title} required maxlength={120} />
          </label>
          <label>
            日期
            <input type="date" name="date" value={page.date} required />
          </label>
          <label>
            正文（Markdown）
            <textarea name="body" rows={20} required>
              {page.body}
            </textarea>
          </label>
          <div class="form-actions">
            <button class="btn" type="submit">
              保存
            </button>
            <a class="btn ghost" href="/admin/pages">
              取消
            </a>
          </div>
        </form>
        <div class="admin-preview">
          <h3>预览</h3>
          <div class="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
        </div>
      </section>
    </>
  )
}

const fmtTs = (iso: string): string => iso.slice(0, 16).replace('T', ' ')

const EXTERNAL_CATS = ['搜索引擎', '平台/社交', '外部链接']

export function StatsView({
  overview,
  daily,
  topPaths,
  referers,
  bySource,
  byIp,
  bots,
  recent,
}: {
  overview: StatsOverview
  daily: DayStat[]
  topPaths: PathStat[]
  referers: RefererStat[]
  bySource: SourceStat[]
  byIp: { ip: string; views: number; first: string; last: string; referers: string; geo: string; kind: string }[]
  bots: { bot: string; pv: number; uv: number; last: string; ips: string }[]
  recent: RecentView[]
}) {
  const maxViews = Math.max(1, ...daily.map((d) => d.views))
  const botPv = bots.reduce((n, b) => n + b.pv, 0)
  const externalUv = bySource.filter((s) => EXTERNAL_CATS.includes(s.category)).reduce((n, s) => n + s.uv, 0)
  const externalPv = bySource.filter((s) => EXTERNAL_CATS.includes(s.category)).reduce((n, s) => n + s.pv, 0)
  const verdict =
    (externalUv === 0
      ? '近 7 天：还没有「从外部找来」的真人读者（当前数字基本都是你自己或站内点击）。'
      : `近 7 天：有 ${externalUv} 位真实外部读者，共 ${externalPv} 次外部来源访问。`) +
    `（另有爬虫/蜘蛛抓取 ${botPv} 次）`
  return (
    <>
      <AdminNav active="stats" />
      <p class="muted">
        只统计<strong>真人</strong>页面访问（已排除搜索引擎蜘蛛、扫描器，<strong>以及你登录后的访问</strong>）；数据仅管理员可见。
      </p>

      <p class="stat-verdict">{verdict}</p>

      <div class="stat-cards">
        <div class="stat-card">
          <span class="stat-num">{overview.todayPv}</span>
          <span class="stat-label">今日 PV</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{overview.todayUv}</span>
          <span class="stat-label">今日 UV</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{overview.weekPv}</span>
          <span class="stat-label">近 7 天 PV</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{overview.weekUv}</span>
          <span class="stat-label">近 7 天 UV</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{overview.pv}</span>
          <span class="stat-label">累计 PV</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{overview.uv}</span>
          <span class="stat-label">累计 UV</span>
        </div>
      </div>

      <h2>近 14 天趋势</h2>
      {daily.length === 0 ? (
        <p class="empty">暂无访问数据。</p>
      ) : (
        <div class="bars">
          {daily.map((d) => (
            <div class="bar-row" key={d.day}>
              <span class="bar-day">{d.day.slice(5)}</span>
              <span class="bar-track">
                <span class="bar-fill" style={`width:${Math.round((d.views / maxViews) * 100)}%`} />
              </span>
              <span class="bar-val">
                {d.views} / {d.visitors}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2>热门页面（近 7 天）</h2>
      {topPaths.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>路径</th>
              <th>PV</th>
              <th>UV</th>
            </tr>
          </thead>
          <tbody>
            {topPaths.map((p) => (
              <tr key={p.path}>
                <td>
                  <a href={p.path}>{p.path}</a>
                </td>
                <td>{p.views}</td>
                <td>{p.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>来源分类（近 7 天）</h2>
      {bySource.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>来源类型</th>
              <th>PV</th>
              <th>UV</th>
            </tr>
          </thead>
          <tbody>
            {bySource.map((s) => (
              <tr key={s.category} class={EXTERNAL_CATS.includes(s.category) ? 'is-external' : undefined}>
                <td>{s.category}</td>
                <td>{s.pv}</td>
                <td>{s.uv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>访客来源（按 IP，近 7 天）</h2>
      {byIp.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>IP</th>
              <th>归属地 / 运营商</th>
              <th>类型</th>
              <th>次数</th>
              <th>最近(UTC)</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {byIp.map((r) => (
              <tr key={r.ip}>
                <td>{r.ip}</td>
                <td>{r.geo || '-'}</td>
                <td class={r.kind === '住宅/正常' ? 'ok-type' : 'dc'}>{r.kind}</td>
                <td>{r.views}</td>
                <td>{fmtTs(r.last)}</td>
                <td>{r.referers || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>爬虫 / 蜘蛛（近 7 天）</h2>
      {bots.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>爬虫</th>
              <th>IP</th>
              <th>抓取次数</th>
              <th>IP 数</th>
              <th>最近(UTC)</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => (
              <tr key={b.bot}>
                <td>{b.bot}</td>
                <td>{b.ips || '-'}</td>
                <td>{b.pv}</td>
                <td>{b.uv}</td>
                <td>{fmtTs(b.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>来源明细（近 7 天）</h2>
      {referers.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>来源</th>
              <th>PV</th>
            </tr>
          </thead>
          <tbody>
            {referers.map((r) => (
              <tr key={r.referer}>
                <td>{r.referer ? <a href={r.referer} rel="noreferrer">{r.referer}</a> : '（直接 / 无来源）'}</td>
                <td>{r.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>最近访问</h2>
      {recent.length === 0 ? (
        <p class="empty">暂无。</p>
      ) : (
        <table class="admin-table">
          <thead>
            <tr>
              <th>时间 (UTC)</th>
              <th>路径</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((v) => (
              <tr key={`${v.created_at}-${v.path}`}>
                <td>{fmtTs(v.created_at)}</td>
                <td>{v.path}</td>
                <td>{v.referer || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
