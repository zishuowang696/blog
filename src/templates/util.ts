export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(name)}`
}

export const SITE_NAME = 'Edge Embedded Notes'
export const SITE_DESC = 'OpenWrt / Yocto / NVIDIA Tegra embedded development and edge AI gateway notes'
