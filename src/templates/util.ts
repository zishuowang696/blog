export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(name)}`
}

export function seriesHref(name: string): string {
  return `/series/${encodeURIComponent(name)}`
}

export const SITE_NAME = 'Agent and Edge AI'

export const SITE_DESC_EN =
  'Build AI agents and ship them on the edge — OpenWrt / Yocto / NVIDIA Tegra embedded & edge AI gateway notes'
export const SITE_DESC_ZH =
  '从 0 构建 AI Agent，并把它落到边缘 —— OpenWrt / Yocto / NVIDIA Tegra 与边缘 AI 网关实践'

export function siteDesc(lang: 'zh' | 'en'): string {
  return lang === 'zh' ? SITE_DESC_ZH : SITE_DESC_EN
}

// 站点级（如 llms.txt）用的英文简介
export const SITE_DESC = SITE_DESC_EN
