import { Hono } from 'hono'
import type { Context } from 'hono'
import { createSession, createUser, getUserByUsername, pruneSessions, setUserRole } from '../lib/db.ts'
import type { User } from '../lib/db.ts'
import {
  hashPassword,
  normalizeUsername,
  roleFor,
  setSessionCookie,
  destroySession,
  validateEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '../lib/auth.ts'
import { resolveLang, t, type Lang } from '../lib/locale.ts'
import { renderHtml } from '../templates/layout.tsx'
import { AuthView } from '../views/auth.tsx'

export const authRoutes = new Hono()

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

function errText(lang: Lang, code: string | null): string | undefined {
  if (!code) return undefined
  return t(lang, `err.${code}`)
}

async function finishLogin(c: Context, user: User, nextRaw: string | null) {
  if (roleFor(user.username) === 'admin' && user.role !== 'admin') {
    await setUserRole(user.id, 'admin')
    user = { ...user, role: 'admin' }
  }
  await pruneSessions()
  const session = await createSession(user.id)
  setSessionCookie(c, session.token)
  return c.redirect(safeNext(nextRaw), 303)
}

authRoutes.get('/login', async (c) => {
  const lang = resolveLang(c)
  const error = c.req.query('err') ? errText(lang, 'login_fail') : undefined
  const body = <AuthView mode="login" lang={lang} error={error} next={c.req.query('next') ?? undefined} />
  return c.html(await renderHtml(c, { title: t(lang, 'auth.login_title'), body }))
})

authRoutes.post('/login', async (c) => {
  const lang = resolveLang(c)
  const fd = await c.req.formData()
  const username = normalizeUsername(String(fd.get('username') ?? ''))
  const password = String(fd.get('password') ?? '')
  const next = String(fd.get('next') ?? c.req.query('next') ?? '')

  const user = username ? await getUserByUsername(username) : null
  const ok = user !== null && (await verifyPassword(password, user.password_hash))
  if (!ok || !user) {
    const body = <AuthView mode="login" lang={lang} error={errText(lang, 'login_bad')} next={safeNext(next)} />
    return c.html(await renderHtml(c, { title: t(lang, 'auth.login_title'), body }), 400)
  }
  return finishLogin(c, user, next)
})

authRoutes.get('/register', async (c) => {
  const lang = resolveLang(c)
  const body = <AuthView mode="register" lang={lang} next={c.req.query('next') ?? undefined} />
  return c.html(await renderHtml(c, { title: t(lang, 'auth.signup_title'), body }))
})

authRoutes.post('/register', async (c) => {
  const lang = resolveLang(c)
  const fd = await c.req.formData()
  const rawUsername = String(fd.get('username') ?? '')
  const password = String(fd.get('password') ?? '')
  const displayName = String(fd.get('display_name') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const next = String(fd.get('next') ?? c.req.query('next') ?? '')

  let code = validateUsername(rawUsername)
  if (!code) code = validatePassword(password)
  if (!code) code = validateEmail(email)
  const username = normalizeUsername(rawUsername)

  if (!code && username && (await getUserByUsername(username))) {
    code = 'taken'
  }
  if (code) {
    const body = <AuthView mode="register" lang={lang} error={errText(lang, code)} next={safeNext(next)} />
    return c.html(await renderHtml(c, { title: t(lang, 'auth.signup_title'), body }), 400)
  }

  const passwordHash = await hashPassword(password)
  const user = await createUser({
    username,
    email,
    display_name: displayName || username,
    password_hash: passwordHash,
    role: roleFor(username),
  })
  return finishLogin(c, user, next)
})

authRoutes.post('/logout', async (c) => {
  await destroySession(c)
  return c.redirect('/', 303)
})
