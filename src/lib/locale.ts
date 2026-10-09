import type { Context } from 'hono'

export type Lang = 'zh' | 'en'
export const EN_PREFIX = '/en'

export function langBase(lang: Lang): string {
  return lang === 'en' ? EN_PREFIX : ''
}

// 给站内绝对路径加语言前缀：zh 无前缀（根），en 加 /en
export function langHref(lang: Lang, path: string): string {
  const base = langBase(lang)
  if (path === '/') return base || '/'
  return base + path
}

// 去掉 /en 前缀，得到语言无关的路径（用于互相跳转 / hreflang）
export function stripLang(path: string): string {
  if (path === EN_PREFIX) return '/'
  if (path.startsWith(EN_PREFIX + '/')) return path.slice(EN_PREFIX.length)
  return path
}

// 语言由 URL 决定：/en/* 为英文，其余为中文（对搜索引擎确定、可收录）
export function resolveLang(c: Context): Lang {
  const p = c.req.path
  return p === EN_PREFIX || p.startsWith(EN_PREFIX + '/') ? 'en' : 'zh'
}

export const zh: Record<string, string> = {
  'nav.posts': '文章',
  'nav.tags': '标签',
  'nav.series': '系列',
  'ui.theme': '切换主题',
  'nav.about': '关于',
  'nav.console': '控制台',
  'acct.login': '登录',
  'acct.signup': '注册',
  'acct.logout': '退出',
  'acct.to_zh': '中文',
  'acct.to_en': 'EN',
  'home.hero': 'Agent 开发 × 嵌入式边缘 AI',
  'search.placeholder': '搜索文章…（例如 menuconfig / recipe / TensorRT）',
  'search.title': '搜索',
  'search.submit': '搜索',
  'search.hint': '支持对标题、摘要、系列与正文全文检索。',
  'list.more': '加载更多',
  'tags.title': '标签',
  'tags.muted': '按主题归档：OpenWrt / Yocto / Jetson / AI 网关…',
  'tags.count': '共 {n} 篇',
  'tags.title_one': '标签：{tag}',
  'series.title': '系列',
  'series.muted': '按系列连载：从 0 构建 AI Agent、AI 网关实战…',
  'series.count': '共 {n} 篇',
  'series.title_one': '系列：{name}',
  'post.all': '← 全部文章',
  'post.older': '上一篇',
  'post.newer': '下一篇',
  'nf.msg': '页面不存在或文章尚未发布。',
  'nf.forbidden': '需要管理员权限。',
  'ui.back_home': '返回首页',
  'ui.prev': '上一页',
  'ui.next': '下一页',
  'auth.login_title': '登录',
  'auth.signup_title': '创建账号',
  'auth.username': '用户名',
  'auth.password': '密码',
  'auth.display_name': '显示昵称（可选）',
  'auth.email': '邮箱（可选）',
  'auth.uname_ph': '小写字母/数字/_/-',
  'auth.display_ph': '默认同用户名',
  'auth.to_login': '已有账号？',
  'auth.to_signup': '还没有账号？',
  'err.login_fail': '登录失败，请检查用户名或密码',
  'err.login_bad': '用户名或密码不正确',
  'err.user_format': '用户名需 3-24 位，仅允许小写字母、数字、- 与 _',
  'err.pw_short': '密码至少 8 位',
  'err.pw_long': '密码过长',
  'err.email': '邮箱格式不正确',
  'err.taken': '该用户名已被注册',
  'c.title': '评论',
  'c.empty': '还没有评论，来抢沙发～',
  'c.placeholder': '分享你的看法（以纯文本展示）',
  'c.as': '以 {name} 的身份发表',
  'c.submit': '发表评论',
  'c.login_hint': '登录后即可参与评论',
  'c.delete': '删除',
  'c.confirm': '确认删除这条评论？',
  'c.err_len': '评论内容需在 1-2000 字之间',
  'c.err_missing': '评论不存在',
  'c.err_denied': '无权删除',
  's.results': '“{q}” 共 {n} 条结果',
  's.none': '未找到与关键词匹配的文章',
  's.more': '还有 {n} 篇，下一页 →',
  's.type_hint': '输入关键词开始搜索',
  't.empty': '暂无标签',
}

export const en: Record<string, string> = {
  'nav.posts': 'Posts',
  'nav.tags': 'Tags',
  'nav.series': 'Series',
  'ui.theme': 'Toggle theme',
  'nav.about': 'About',
  'nav.console': 'Console',
  'acct.login': 'Log in',
  'acct.signup': 'Sign up',
  'acct.logout': 'Log out',
  'acct.to_zh': '中文',
  'acct.to_en': 'EN',
  'home.hero': 'AI Agents × Embedded Edge',
  'search.placeholder': 'Search posts… (e.g. menuconfig / recipe / TensorRT)',
  'search.title': 'Search',
  'search.submit': 'Search',
  'search.hint': 'Full-text search across titles, summaries, series and content.',
  'list.more': 'Load more',
  'tags.title': 'Tags',
  'tags.muted': 'Grouped by topic: OpenWrt / Yocto / Jetson / AI gateway…',
  'tags.count': '{n} posts',
  'tags.title_one': 'Tag: {tag}',
  'series.title': 'Series',
  'series.muted': 'Grouped by series.',
  'series.count': '{n} posts',
  'series.title_one': 'Series: {name}',
  'post.all': '← All posts',
  'post.older': 'Older',
  'post.newer': 'Newer',
  'nf.msg': 'Page not found, or the article is not published yet.',
  'nf.forbidden': 'Admin access required.',
  'ui.back_home': 'Back to home',
  'ui.prev': 'Previous',
  'ui.next': 'Next',
  'auth.login_title': 'Log in',
  'auth.signup_title': 'Create account',
  'auth.username': 'Username',
  'auth.password': 'Password',
  'auth.display_name': 'Display name (optional)',
  'auth.email': 'Email (optional)',
  'auth.uname_ph': 'lowercase letters / digits / _ -',
  'auth.display_ph': 'defaults to username',
  'auth.to_login': 'Already have an account?',
  'auth.to_signup': 'No account yet?',
  'err.login_fail': 'Log in failed. Check your username and password.',
  'err.login_bad': 'Incorrect username or password',
  'err.user_format': 'Username must be 3-24 chars (lowercase letters, digits, _ or -)',
  'err.pw_short': 'Password must be at least 8 characters',
  'err.pw_long': 'Password too long',
  'err.email': 'Invalid email format',
  'err.taken': 'That username is already taken',
  'c.title': 'Comments',
  'c.empty': 'No comments yet — be the first!',
  'c.placeholder': 'Share your thoughts (shown as plain text)',
  'c.as': 'Comment as {name}',
  'c.submit': 'Post comment',
  'c.login_hint': 'Log in to comment',
  'c.delete': 'Delete',
  'c.confirm': 'Delete this comment?',
  'c.err_len': 'Comment must be between 1 and 2000 characters',
  'c.err_missing': 'Comment not found',
  'c.err_denied': 'Not allowed to delete',
  's.results': '{n} results for “{q}”',
  's.none': 'No posts match your search.',
  's.more': '{n} more →',
  's.type_hint': 'Type a keyword to start searching',
  't.empty': 'No tags yet',
}

export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const table = lang === 'zh' ? zh : en
  let s = table[key] ?? key
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}
