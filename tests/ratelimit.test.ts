import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { rateLimitSensitive } from '../src/middleware/http.ts'

const makeApp = () => {
  const app = new Hono()
  app.use('*', rateLimitSensitive)
  app.get('/login', (c) => c.text('ok'))
  app.get('/hello', (c) => c.text('ok'))
  return app
}

describe('rateLimitSensitive', () => {
  test('非敏感路径不限流', async () => {
    const app = makeApp()
    for (let i = 0; i < 50; i++) {
      const res = await app.request('/hello', { headers: { 'x-forwarded-for': '1.1.1.1' } })
      expect(res.status).toBe(200)
    }
  })

  test('登录路径超过阈值返回 429', async () => {
    const app = makeApp()
    const call = () => app.request('/login', { headers: { 'x-forwarded-for': '2.2.2.2' } })
    for (let i = 0; i < 20; i++) expect((await call()).status).toBe(200)
    const blocked = await call()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
  })

  test('cf-connecting-ip 优先作为限流键', async () => {
    const app = makeApp()
    for (let i = 0; i < 25; i++) {
      await app.request('/login', { headers: { 'cf-connecting-ip': '3.3.3.3' } })
    }
    const other = await app.request('/login', { headers: { 'cf-connecting-ip': '4.4.4.4' } })
    expect(other.status).toBe(200)
  })
})
