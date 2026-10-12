export interface GeoInfo {
  country: string
  region: string
  isp: string
}

const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|0\.|::1|fc|fd|fe80)/i

export async function lookupIp(ip: string): Promise<GeoInfo> {
  const empty: GeoInfo = { country: '', region: '', isp: '' }
  if (!ip || ip === 'unknown' || PRIVATE.test(ip)) return empty
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return empty
    const d = (await res.json()) as {
      success?: boolean
      country?: string
      region?: string
      connection?: { isp?: string; org?: string }
    }
    if (d.success === false) return empty
    return { country: d.country ?? '', region: d.region ?? '', isp: d.connection?.isp || d.connection?.org || '' }
  } catch {
    return empty
  }
}
