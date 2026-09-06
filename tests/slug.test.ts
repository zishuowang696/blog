import { describe, expect, test } from 'bun:test'
import { slugify } from '../src/lib/slug.ts'

describe('slugify', () => {
  test('纯 ASCII 小写连字符', () => {
    expect(slugify('OpenWrt Buildroot Notes')).toBe('openwrt-buildroot-notes')
  })
  test('中文与特殊字符被剥离', () => {
    expect(slugify('menuconfig 裁剪内核!')).toBe('menuconfig')
  })
  test('空串安全', () => {
    expect(slugify('   ')).toBe('')
  })
})
