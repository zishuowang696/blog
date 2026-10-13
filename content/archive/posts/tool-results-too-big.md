---
title: "工具结果太大，别直接回喂给模型"
date: 2026-10-13
tags: [ai-agent, 上下文, 工具调用, 教程]
summary: "Agent 最隐蔽的性能杀手：工具返回一大堆日志/文件，你原样塞回上下文——token 爆炸、变慢、模型还被淹死。真正的修法在『工具』这一侧：把取数口当打印口，就等着爆。"
series: "从 0 构建 AI Agent"
published: true
---

上一篇讲了 [messages 越滚越大](/posts/agent-context-management)。而**膨胀的最大来源，往往就一个**：

> **工具返回的结果太大，你却原样塞回上下文。**

一次 `cat` 日志 200KB、一次 `ls -R` 几千行、一次 Web 抓取一整页 HTML……全进了 messages。结果：

- **token 爆炸** → 钱和延迟一起涨；
- **模型被淹死** → 真正有用的那 3 行，淹没在 5 万行里，它反而看不出来；
- 再大一点 → **直接撑爆上下文**。

## 核心心法

> **工具是"取数口"，不是"打印口"。**

进入 messages 的**每个字节都要付 token 钱**，还要挤占模型的注意力。所以工具化的正确姿势**不是**"把输出丢回来"，而是"**把需要的那部分、以最小的形态取回来**"。

```
工具执行
   ↓
【过滤 / 截断 / 摘要】   ← 关键的一步，多数人漏掉
   ↓
回喂给模型（小、准）
```

## 四个具体做法

### 1. 兜底：截断 + 头尾
最简单——超长就**掐头留尾**，中间省略。

```python
MAX = 4000  # 单个工具结果上限（字符）

def cap(text: str, limit: int = MAX) -> str:
    if len(text) <= limit:
        return text
    half = limit // 2
    return f"{text[:half]}\n…（省略 {len(text) - limit} 字符）…\n{text[-half:]}"
```

### 2. 别 `cat`，要"分页读"
给模型一个能**按需读取**的工具，而不是把整文件甩给它。

```python
def read_file(path: str, offset: int = 0, limit: int = 100) -> str:
    lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()
    chunk = lines[offset : offset + limit]
    more = len(lines) - (offset + limit)
    out = "\n".join(chunk)
    if more > 0:
        out += f"\n…（还有 {more} 行，用 offset={offset + limit} 继续读）"
    return out
```

### 3. 给"检索"工具，而不是"全量"工具
查日志时，**在工具里先过滤**，只回命中的行。

```python
def search_log(path: str, pattern: str, max_hits: int = 30) -> str:
    hits = [f"{i+1}: {ln}" for i, ln in enumerate(
        open(path, encoding="utf-8", errors="ignore")) if pattern in ln]
    body = "\n".join(hits[:max_hits])
    return body + (f"\n…共 {len(hits)} 处命中" if len(hits) > max_hits else "")
```

### 4. 结构性结果：只回"要点"
跑命令时，别回整个 stdout，回**退出码 + 关键几行 + 统计**：

```python
def run_and_summarize(cmd: str) -> str:
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    out = p.stdout
    return (f"exit={p.returncode}\n"
            f"stdout({len(out)} 字符，末尾 30 行):\n"
            + "\n".join(out.splitlines()[-30:])
            + (f"\nstderr:\n{p.stderr[-1000:]}" if p.stderr else ""))
```

## 一句话规则

| 想做的事 | 错误姿势 | 正确姿势 |
| --- | --- | --- |
| 看日志 | `cat app.log` | `search_log(path, 关键词)` |
| 读文件 | 整文件回喂 | `read_file(offset, limit)` |
| 跑命令 | 全量 stdout | 退出码 + 尾部 + 统计 |
| Web 抓取 | 整页 HTML | 提取正文 / 摘要后再回喂 |

## 为什么这对边缘更重要

边缘 / 小模型窗口常常只有 **8K**。**一次没过滤的 `cat`，就能把整个上下文吃光。**

> 在云端，"结果太大"是**变慢变贵**；在边缘，是**直接跑不起来**。

## 收尾

记住这句：

> **工具的价值，不在它"能取多少"，而在它"能只回多少"。**

设计工具时多问一句：**这段输出，模型真的全需要吗？** —— 大多数时候，不需要。

---

> 💬 你踩过"工具结果把上下文撑爆"的坑吗？评论区聊聊。
> 🛠️ 需要**嵌入式 / 边缘 AI / Agent 定制与咨询**？见 [关于页](/about)。
