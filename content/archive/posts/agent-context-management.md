---
title: "Agent 的 messages 越滚越大？几个实用解法"
date: 2026-10-13
tags: [ai-agent, 上下文, 记忆, 教程]
summary: "Agent 跑着跑着，messages 数组越滚越大：token 暴涨、变慢，最后直接撑爆上下文窗口。这不是小问题，是生产级 Agent 的头号工程问题。6 个解法 + 可跑代码。"
series: "从 0 构建 AI Agent"
published: true
---

上一篇我们写了 [Agent 的本质是循环](/posts/function-calling-explained)：**问模型 → 跑工具 → 回喂**。

跑起来你就会撞到一个隐藏的坑：

> **messages 数组越滚越大。**

每轮对话，你都在往后 append：用户消息、助理消息、**每个工具的结果**……几十轮之后：

- **token 暴涨** → 又贵又慢；
- 再久一点 → **超过上下文窗口，直接报错**。

这不是小问题，是**生产级 Agent 的头号工程问题**。这篇讲清它、并给几个能落地的解法。

## 为什么一定会涨

```
system 提示
+ 用户消息
+ [助理消息 + 工具结果] × N   ← 每一轮都往后堆，永不回收
```

问题在于：**你从不删除，只添加。** 而工具结果往往是最大的那个（一次 `cat` 日志 100KB 很常见）。

## 6 个解法（从简单到进阶）

### 1. 别把大结果塞进 messages（收益最大，最常被忽略）
工具返回 100KB 日志？**别原样回喂。** 只回喂**摘要 / 前 N 行**，原始数据落盘，需要时再查。

> 原则：**进入 messages 的每个字节，都要付 token 钱。**

```python
def run_tool_safely(out, limit=2000):
    if len(out) > limit:
        return out[:limit] + f"\n…（截断，共 {len(out)} 字符，已存文件）"
    return out
```

### 2. 滑窗裁剪
保留 `system` + **最近 K 轮**，丢掉更早的。简单粗暴。

```python
def trim(messages, keep=12):
    head = [m for m in messages if m.get("role") == "system"]
    return head + messages[-keep:]
```

### 3. 滚动摘要（推荐）
丢之前，先让模型把"要丢掉的历史"**压成一段话**，替换掉原始消息。窗口小，信息还在。

```python
def compact(messages, keep=8):
    if len(messages) <= keep:
        return messages
    old, recent = messages[:-keep], messages[-keep:]
    summary = summarize(old)                 # 让模型把 old 总结成一段
    return [{"role": "system", "content": f"早前对话摘要：{summary}"}] + recent
```

### 4. 结构化记忆
从对话里抽出**事实 / 偏好 / 结论**，存成小文档或键值（如"用户在做 Jetson 边缘网关"），需要时注入。

> **记忆 ≠ 全量历史。** 记住"要点"，不是背下"全程"。

### 5. 检索式记忆（RAG）
历史存到外部（向量库 / 文件），用时**按需检索相关片段**，而不是全塞进上下文。

### 6. 子 Agent / 上下文隔离
让**子 Agent 在自己的上下文里干脏活**，只把**结果**返回给主 Agent。上下文不共享，就不会一起膨胀。

## 怎么选

| 你的场景 | 推荐 |
| --- | --- |
| 一次性短任务 | 滑窗裁剪就够 |
| 长对话 | 滚动摘要 |
| 要记住用户偏好 / 事实 | 结构化记忆 |
| 历史长且要精准回溯 | 检索式记忆（RAG） |
| 复杂多步任务 | 子 Agent 隔离 |

## 为什么这对边缘特别重要

本地 / 边缘模型上下文更小（很多只有 **8K~32K**）。

> 在云端，messages 管理是**优化**；在边缘，它是**能不能跑**。

## 收尾

一句话记住：

> **上下文是预算，不是仓库。** 每一轮都要问自己：这段历史，还值得留着吗？

**能不留就不留，能压缩就压缩，能外置就外置。**

---

> 💬 你的 Agent 是怎么管上下文 / 记忆的？评论区聊聊。
> 🛠️ 需要**嵌入式 / 边缘 AI / Agent 定制与咨询**？见 [关于页](/about)。
