export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(name)}`
}

export const SITE_NAME = '嵌入边缘笔记'
export const SITE_DESC = 'OpenWrt / Yocto / NVIDIA Tegra 嵌入式开发学习与边缘 AI 网关实践'
