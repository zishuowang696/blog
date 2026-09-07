import type { Context } from 'hono'
import { deleteSession, findSession, type Role, type User } from './db.ts'
import { envStr } from './env.ts'

export const SESSION_COOKIE = 'sid'
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60

export const ADMIN_USERNAMES: string[] = (envStr('ADMIN_USERNAMES') ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function validateUsername(raw: string): string | null {
  const name = normalizeUsername(raw)
  if (!/^[a-z0-9_-]{3,24}$/.test(name)) return 'Username must be 3-24 chars (lowercase letters, digits, _ or -)'
  return null
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters'
  if (pw.length > 128) return 'Password too long'
  return null
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim()
  if (email === '') return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format'
  return null
}

export function roleFor(username: string): Role {
  return ADMIN_USERNAMES.includes(normalizeUsername(username)) ? 'admin' : 'user'
}

const PBKDF2_ITERATIONS = 100_000

function hex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

function fromHex(hexStr: string): Uint8Array {
  const out = new Uint8Array(hexStr.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16)
  return out
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, length = 32): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
    key,
    length * 8,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const hash = await pbkdf2(pw, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex(salt)}$${hex(hash)}`
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  const salt = fromHex(parts[2] ?? '')
  const expect = fromHex(parts[3] ?? '')
  const got = await pbkdf2(pw, salt, iterations, expect.length)
  if (got.length !== expect.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i]! ^ expect[i]!
  return diff === 0
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

export async function getSessionUser(c: Context): Promise<User | null> {
  const token = readSessionToken(c)
  if (!token) return null
  const session = await findSession(token)
  return session?.user ?? null
}

export async function destroySession(c: Context): Promise<void> {
  const token = readSessionToken(c)
  if (token) await deleteSession(token)
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`)
}

export function isAdmin(user: User | null): user is User {
  return user?.role === 'admin'
}

export function setSessionCookie(c: Context, token: string): void {
  const secure = envStr('SITE_URL')?.startsWith('https://') ? '; Secure' : ''
  c.header(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax${secure}`,
  )
}
