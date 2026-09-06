export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized
}

export function ensureTrailingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}
