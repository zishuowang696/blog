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
export const SITE_DESC = 'Build AI agents and ship them on the edge — OpenWrt / Yocto / NVIDIA Tegra embedded & edge AI gateway notes'

// 邮件订阅（follow.it 的订阅表单接口）
export const NEWSLETTER_ACTION =
  'https://api.follow.it/subscription-form/OFZySzN4TWd3Q3hEbC9vQzd5bmdKVjJ0QzlTSEFCaThWTkZLempiY0M4eWJBNTVONlVTdjV5SFdlanNJbDN5Y2F3R2x5Zks4WFh0Y2ZJb3V4T3hDZTlwNkNqUThMNlJzSUlKNnlsdHJlazFwZk5mNkxwbkZITm1BcWtaRjcwa1h8d2Rpb3pjbjRXcUtjLzdTeGJvZytVOU5COW1EL0FhT1BVV3BMOXRsT2dlTT0=/8'
