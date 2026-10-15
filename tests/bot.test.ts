import { describe, expect, test } from 'bun:test'
import { botName, isCrawlerByBehavior } from '../src/middleware/http.ts'

describe('botName', () => {
  test('真浏览器不计为机器人', () => {
    expect(botName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0')).toBe('')
    expect(botName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36')).toBe('')
  })

  test('搜索引擎抓取', () => {
    expect(botName('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe('Googlebot')
    expect(botName('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe('Bingbot')
  })

  test('营销数据爬虫（UA 里挂名字）', () => {
    expect(botName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; BuiltWith/1.4; rb.gy/xprgqj) Chrome/124.0.0.0 Safari/537.36')).toBe('营销数据爬虫')
  })

  test('安全扫描 / 监控', () => {
    expect(botName('Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)')).toBe('安全扫描')
    expect(botName('Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)')).toBe('监控')
  })

  test('脚本/命令行', () => {
    expect(botName('python-requests/2.31.0')).toBe('脚本/扫描')
    expect(botName('curl/8.4.0')).toBe('脚本/扫描')
  })
})

describe('isCrawlerByBehavior', () => {
  test('短时间访问大量不同路径 → 判为爬虫', () => {
    const t0 = 1_000_000
    let flagged = false
    for (let i = 0; i < 60; i++) {
      if (isCrawlerByBehavior('crawler-ip', `/tags/t${i}`, t0 + i)) flagged = true
    }
    expect(flagged).toBe(true)
  })

  test('正常浏览（少量页面 / 重复访问同页）不判', () => {
    const t0 = 2_000_000
    for (let i = 0; i < 10; i++) {
      expect(isCrawlerByBehavior('human-ip', '/', t0 + i)).toBe(false)
      expect(isCrawlerByBehavior('human-ip', '/about', t0 + i)).toBe(false)
    }
  })

  test('窗口过期后重新计数', () => {
    const t0 = 3_000_000
    for (let i = 0; i < 40; i++) isCrawlerByBehavior('slow-ip', `/tags/s${i}`, t0 + i)
    expect(isCrawlerByBehavior('slow-ip', '/tags/other', t0 + 1_900_000)).toBe(false)
  })
})
