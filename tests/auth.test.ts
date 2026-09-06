import { describe, expect, test } from 'bun:test'
import {
  hashPassword,
  normalizeUsername,
  roleFor,
  validateEmail,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '../src/lib/auth.ts'

describe('auth: PBKDF2 密码', () => {
  test('hash/verify 往返与错误密码', async () => {
    const hash = await hashPassword('password123')
    expect(hash.startsWith('pbkdf2$')).toBe(true)
    expect(await verifyPassword('password123', hash)).toBe(true)
    expect(await verifyPassword('wrong-pass', hash)).toBe(false)
  })
})

describe('auth: 校验与角色', () => {
  test('用户名/密码/邮箱校验', () => {
    expect(validateUsername('alice_01')).toBeNull()
    expect(validateUsername('A')).not.toBeNull()
    expect(validateUsername('中文名')).not.toBeNull()
    expect(validatePassword('short')).not.toBeNull()
    expect(validatePassword('12345678')).toBeNull()
    expect(validateEmail('a@b.co')).toBeNull()
    expect(validateEmail('bad')).not.toBeNull()
  })

  test('normalize 与默认角色', () => {
    expect(normalizeUsername(' Alice ')).toBe('alice')
    expect(roleFor('someone-not-in-env')).toBe('user')
  })
})
