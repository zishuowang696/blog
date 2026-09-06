import type { Context } from 'hono'
import { deleteSession, findSession, setUserRole, type Role, type User } from './db.ts'

export const SESSION_COOKIE = 'sid'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60

export const ADMIN_USERNAMES: string[] = (Bun.env.ADMIN_USERNAMES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(raw: string): string | null {
  const name = normalizeUsername(raw)
  if (!/^[a-z0-9_-]{3,24}$/.test(name)) return '用户名需 3-24 位，仅允许小写字母、数字、- 与 _'
  return null
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return '密码至少 8 位'
  if (pw.length > 128) return '密码过长'
  return null
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim()
  if (email === '') return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '邮箱格式不正确'
  return null
}

export function roleFor(username: string): Role {
  return ADMIN_USERNAMES.includes(normalizeUsername(username)) ? 'admin' : 'user'
}

export async function hashPassword(pw: string): Promise<string> {
  return Bun.password.hash(pw, { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 })
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return Bun.password.verify(pw, hash)
}

function parseCookies(header: string | undefined): Map<string, string> {
  const out = new Map<string, string>()
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    out.set(part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim()))
  }
  return out
}

export function readSessionToken(c: Context): string | null {
  const cookies = parseCookies(c.req.header('cookie'))
  const token = cookies.get(SESSION_COOKIE)
  return token && token.length === 64 ? token : null
}

export function getSessionUser(c: Context): User | null {
  const token = readSessionToken(c)
  if (!token) return null
  const session = findSession(token)
  return session?.user ?? null
}

export function isAdmin(user: User | null): user is User {
  return user?.role === 'admin'
}

export function ensureAdmin(c: Context): User | null {
  const user = getSessionUser(c)
  if (!isAdmin(user)) return null
  const wanted = roleFor(user.username)
  if (user.role !== wanted) {
    setUserRole(user.id, wanted)
    return { ...user, role: wanted }
  }
  return user
}

export function destroySession(c: Context): void {
  const token = readSessionToken(c)
  if (token) deleteSession(token)
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`)
}

export function setSessionCookie(c: Context, token: string): void {
  const secure = Bun.env.SITE_URL?.startsWith('https://') ? '; Secure' : ''
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  )
}
