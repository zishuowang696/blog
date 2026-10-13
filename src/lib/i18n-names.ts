import type { Lang } from './locale.ts'

// 标签 / 系列的英文显示名（仅影响展示，URL 与数据仍用原名）
const NAME_EN: Record<string, string> = {
  '从0': 'From Scratch',
  '内存': 'Memory',
  '内容运营': 'Content Ops',
  '协议': 'Protocol',
  '压缩': 'Compression',
  '原理': 'Principles',
  '可观测': 'Observability',
  '向量': 'Vectors',
  '团队': 'Team',
  '固件编译': 'Firmware Build',
  '实现': 'Implementation',
  '客户端': 'Client',
  '客户端开发': 'Client Development',
  '嵌入式': 'Embedded',
  '工具调用': 'Tool Calling',
  '工程效率': 'Engineering Efficiency',
  '思考': 'Thoughts',
  '成本': 'Cost',
  '教程': 'Tutorial',
  '智能体': 'AI Agents',
  '构建': 'Build',
  '构建提速': 'Faster Builds',
  '架构': 'Architecture',
  '网络': 'Networking',
  '职业': 'Career',
  '自动化': 'Automation',
  '记忆': 'Agent Memory',
  '上下文': 'Context',
  '调试': 'Debugging',
  '转岗': 'Career Switch',
  '边缘': 'Edge',
  '边缘ai': 'Edge AI',
  '部署': 'Deployment',
  '镜像': 'Image',
  'ai网关': 'AI Gateway',
  'AI 网关实战': 'AI Gateway in Practice',
  'OpenWrt 编译入门': 'OpenWrt Build Intro',
  'Yocto 构建系统笔记': 'Yocto Build System Notes',
  '从 0 构建 AI Agent': 'Build an AI Agent from Scratch',
}

export function localizeName(name: string, lang: Lang): string {
  if (lang !== 'en') return name
  return NAME_EN[name] ?? name
}
