
import type { PageMeta, PostMeta } from '../lib/db.ts'
import type { PageInput, PostInput } from '../lib/content.ts'
import { renderMarkdown } from '../lib/md.ts'
import { fmtDate } from '../templates/util.ts'

type AdminTab = 'list' | 'new' | 'import' | 'pages'

function AdminNav({ active }: { active: AdminTab }) {
  const tabs: { key: AdminTab; label: string; href: string }[] = [
    { key: 'list', label: '文章管理', href: '/admin' },
    { key: 'new', label: '写新文章', href: '/admin/new' },
    { key: 'import', label: '导入 Markdown', href: '/admin/import' },
    { key: 'pages', label: '静态页面', href: '/admin/pages' },
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
