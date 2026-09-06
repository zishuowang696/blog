import { renderMarkdown } from '../lib/md.ts'
import { fmtDate } from '../templates/util.ts'

export interface AdminPostModel {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  series: string
  published: boolean
  body: string
}

function Nav({ active }: { active: 'list' | 'new' }) {
  return (
    <>
      <p class="crumbs">
        <a href="/">← 返回站点</a>
      </p>
      <header class="page-head">
        <h1>写作控制台</h1>
      </header>
      <nav class="tabs">
        <a href="/admin" aria-current={active === 'list' ? 'page' : undefined}>
          文章管理
        </a>
        <a href="/admin/new" aria-current={active === 'new' ? 'page' : undefined}>
          写新文章
        </a>
      </nav>
    </>
  )
}

export function AdminListView({ rows }: { rows: AdminPostModel[] }) {
  return (
    <>
      <Nav active="list" />
      {rows.length === 0 ? (
        <p class="empty">暂无文章，点右上角「写新文章」开始。</p>
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
                      {...{ 'hx-confirm': '确认删除这篇及其源文件？' }}
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
  slugLocked,
  error,
  tab,
  previewLabel,
}: {
  post: AdminPostModel
  action: string
  slugLocked: boolean
  error?: string
  tab: 'list' | 'new'
  previewLabel: string
}) {
  return (
    <>
      <Nav active={tab} />
      <section class="editor-card">
        <form action={action} method="post">
          {error ? <p class="flash error">{error}</p> : null}
          <label>
            标题
            <input type="text" name="title" value={post.title} required maxlength={120} />
          </label>
          <label>
            日期
            <input type="date" name="date" value={post.date} required />
          </label>
          <label>
            文件名（slug）
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
          <h3>{previewLabel}</h3>
          <div class="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
        </div>
      </section>
    </>
  )
}
