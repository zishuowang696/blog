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
import { renderHtml } from '../templates/layout.tsx'
import { AuthView } from '../views/auth.tsx'

export const authRoutes = new Hono()

function safeNext(raw: string | null): string {
  if (!raw) return '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
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
  const error = c.req.query('err') ? '登录失败，请检查用户名或密码' : undefined
  const body = <AuthView mode="login" error={error} next={c.req.query('next') ?? undefined} />
  return c.html(await renderHtml(c, { title: '登录', body }))
})

authRoutes.post('/login', async (c) => {
  const fd = await c.req.formData()
  const username = normalizeUsername(String(fd.get('username') ?? ''))
  const password = String(fd.get('password') ?? '')
  const next = String(fd.get('next') ?? c.req.query('next') ?? '')

  const user = username ? await getUserByUsername(username) : null
  const ok = user !== null && (await verifyPassword(password, user.password_hash))
  if (!ok || !user) {
    const body = <AuthView mode="login" error="用户名或密码不正确" next={safeNext(next)} />
    return c.html(await renderHtml(c, { title: '登录', body }), 400)
  }
  return finishLogin(c, user, next)
})

authRoutes.get('/register', async (c) => {
  const body = <AuthView mode="register" next={c.req.query('next') ?? undefined} />
  return c.html(await renderHtml(c, { title: '注册', body }))
})

authRoutes.post('/register', async (c) => {
  const fd = await c.req.formData()
  const rawUsername = String(fd.get('username') ?? '')
  const password = String(fd.get('password') ?? '')
  const displayName = String(fd.get('display_name') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const next = String(fd.get('next') ?? c.req.query('next') ?? '')

  let error = validateUsername(rawUsername)
  if (!error) error = validatePassword(password)
  if (!error) error = validateEmail(email)
  const username = normalizeUsername(rawUsername)

  if (!error && username && (await getUserByUsername(username))) {
    error = '该用户名已被注册'
  }
  if (error) {
    const body = <AuthView mode="register" error={error} next={safeNext(next)} />
    return c.html(await renderHtml(c, { title: '注册', body }), 400)
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
