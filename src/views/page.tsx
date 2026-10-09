import type { Page } from '../lib/db.ts'

export function StaticPageView({ page }: { page: Page }) {
  return (
    <div class="reading">
      <article class="page">
        <header class="page-head">
          <h1>{page.title}</h1>
        </header>
        <div class="markdown-body" dangerouslySetInnerHTML={{ __html: page.content_html }} />
      </article>
    </div>
  )
}
