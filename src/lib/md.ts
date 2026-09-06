export type FrontmatterScalar = string | number | boolean | null
export type FrontmatterValue = FrontmatterScalar | FrontmatterScalar[]

export interface Frontmatter {
  data: Record<string, FrontmatterValue>
  body: string
}

const FENCE_RE = /^\s*(```|~~~)\s*([\w+-]*)\s*$/
const HEADING_RE = /^(#{1,6})\s+(.*)$/
const HR_RE = /^\s*(?:\*\s*){3,}$|^\s*(?:-\s*){3,}$|^\s*(?:_\s*){3,}$/
const LIST_ITEM_RE = /^(\s*)([-+*]|\d+[.)])\s+(.*)$/
const QUOTE_RE = /^\s*>\s?(.*)$/

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function attr(s: string): string {
  return esc(s.replace(/"/g, '&quot;'))
}

function isBlank(s: string): boolean {
  return s.trim() === ''
}

function scalarValue(raw: string): FrontmatterValue {
  const v = raw.trim()
  if (v === '') return ''
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null') return null
  const quoted = v.match(/^(['"])(.*)\1$/)
  if (quoted) return quoted[2] as string
  const num = Number(v)
  if (v !== '' && Number.isFinite(num)) return num
  return v
}

function inline(src: string): string {
  let s = esc(src)
  const codes: string[] = []
  s = s.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(c)
    return `\u0000${codes.length - 1}\u0000`
  })
  s = s.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_m, alt: string, url: string) => `<img src="${attr(url)}" alt="${attr(alt)}">`)
  s = s.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_m, text: string, url: string) => `<a href="${attr(url)}">${text}</a>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${codes[Number(i)] ?? ''}</code>`)
  return s
}

type Block =
  | { type: 'code'; lang: string; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'hr' }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'quote'; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'para'; lines: string[] }

function tokenize(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] as string
    const content = line.trim()

    if (isBlank(content)) {
      i++
      continue
    }

    const fence = content.match(FENCE_RE)
    if (fence) {
      const lang = fence[2] ?? ''
      const code: string[] = []
      i++
      while (i < lines.length && !FENCE_RE.test((lines[i] as string).trim())) {
        code.push(lines[i] as string)
        i++
      }
      i++
      blocks.push({ type: 'code', lang, text: code.join('\n') })
      continue
    }

    const heading = content.match(HEADING_RE)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1]!.length, text: inline((heading[2] ?? '').trim()) })
      i++
      continue
    }

    if (HR_RE.test(content)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    const listItem = line.match(LIST_ITEM_RE)
    if (listItem) {
      const marker = listItem[2]!
      const ordered = /^\d/.test(marker)
      const items: string[] = [listItem[3]!]
      i++
      while (i < lines.length) {
        const next = lines[i] as string
        const m = next.match(LIST_ITEM_RE)
        if (!m || m[2] !== marker) break
        items.push(m[3]!)
        i++
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i] as string)) {
        const m = (lines[i] as string).match(QUOTE_RE)
        quoteLines.push(m![1] ?? '')
        i++
      }
      blocks.push({ type: 'quote', lines: quoteLines })
      continue
    }

    if (content.startsWith('|')) {
      const tableRows: string[] = []
      while (i < lines.length && (lines[i] as string).trim().startsWith('|')) {
        tableRows.push(lines[i] as string)
        i++
      }
      const parsed = tableRows.map(parseRow)
      const delimiterIdx = parsed.findIndex((r) => r !== null && r.every((c) => /^:?-{2,}:?$/.test(c)))
      if (delimiterIdx > 0) {
        const header = parsed[0]!.map((c) => inline(c))
        const rows = parsed
          .slice(delimiterIdx + 1)
          .filter((r): r is string[] => r !== null && r.length > 0)
          .map((r) => r.map((c) => inline(c)))
        if (header.length > 0) blocks.push({ type: 'table', header, rows })
        continue
      }
      blocks.push({ type: 'para', lines: [line] })
      i++
      continue
    }

    const para: string[] = [line]
    i++
    while (i < lines.length) {
      const next = lines[i] as string
      const nc = next.trim()
      if (isBlank(nc)) break
      if (nc.match(HEADING_RE) || nc.match(HR_RE) || nc.match(FENCE_RE)) break
      if (nc.match(LIST_ITEM_RE)) break
      if (QUOTE_RE.test(next)) break
      if (nc.startsWith('|')) break
      para.push(next)
      i++
    }
    blocks.push({ type: 'para', lines: para })
  }
  return blocks
}

function parseRow(line: string): string[] | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return null
  const inner = trimmed.replace(/^\||\|$/g, '')
  return inner.split('|').map((c) => c.trim())
}

function renderParagraphLines(lines: string[]): string {
  return lines.map(inline).join(' ')
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'code': {
      const lang = b.lang ? ` class="language-${esc(b.lang)}"` : ''
      return `<pre><code${lang}>${esc(b.text)}</code></pre>`
    }
    case 'heading':
      return `<h${b.level}>${b.text}</h${b.level}>`
    case 'hr':
      return '<hr>'
    case 'table': {
      const head = `<thead><tr>${b.header.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`
      const bodyRows = b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
      return `<table>${head}<tbody>${bodyRows}</tbody></table>`
    }
    case 'quote': {
      const paras: string[] = []
      let buf: string[] = []
      for (const l of b.lines) {
        if (isBlank(l)) {
          if (buf.length > 0) paras.push(`<p>${renderParagraphLines(buf)}</p>`)
          buf = []
        } else buf.push(l)
      }
      if (buf.length > 0) paras.push(`<p>${renderParagraphLines(buf)}</p>`)
      return `<blockquote>${paras.join('')}</blockquote>`
    }
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul'
      const items = b.items.map((it) => `<li>${inline(it)}</li>`).join('')
      return `<${tag}>${items}</${tag}>`
    }
    case 'para':
      return `<p>${renderParagraphLines(b.lines)}</p>`
  }
}

export function renderMarkdown(src: string): string {
  const blocks = tokenize(src)
  return blocks.map(renderBlock).join('\n')
}

export function parseFrontmatter(src: string): Frontmatter {
  const raw = src.replace(/^\uFEFF/, '')
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: src }
  const yaml = m[1] as string
  const body = (m[2] ?? '').replace(/^\r?\n/, '')
  const data: Record<string, FrontmatterValue> = {}
  for (const line of yaml.split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!key) continue
    const name = key[1]!
    const value = key[2] as string
    if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
      data[name] = value
        .trim()
        .slice(1, -1)
        .split(',')
        .map((s) => scalarValue(s))
        .filter((s): s is string | number | boolean | null => s !== null)
    } else {
      data[name] = scalarValue(value)
    }
  }
  return { data, body }
}

export function extractPlainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
