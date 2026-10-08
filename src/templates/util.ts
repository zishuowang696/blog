export function fmtDate(iso: string): string {
  return iso.slice(0, 10)
}

export function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(name)}`
}

export const SITE_NAME = 'Agent and Edge AI'
export const SITE_DESC = 'Build AI agents and ship them on the edge — OpenWrt / Yocto / NVIDIA Tegra embedded & edge AI gateway notes'
