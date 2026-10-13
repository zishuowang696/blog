---
title: "Function Calling 到底是什么？一张图讲清"
date: 2026-10-12
tags: [function-calling, ai-agent, 工具调用, 教程]
summary: "模型不会自己调用函数——它只会『说要调用哪个、带什么参数』，真正执行的是你的代码。一张图 + 30 行代码讲清 Function Calling 的本质。"
series: "从 0 构建 AI Agent"
published: true
---

很多人以为 Function Calling 是"模型会调用函数"。**不是。**

> **模型不会执行任何函数。它只会输出一段结构化文本：「我要调用 `get_weather`，参数是 `{"city":"Beijing"}`」。真正执行的是你的代码。**

Function Calling（工具调用）的本质就一句话：

> **把"让模型输出一段 JSON 工具请求"变成标准能力，然后由你的程序去执行、再把结果喂回去。**

它没有改变上一篇的老朋友——那个循环：

```
用户提问
   ↓
[模型] 决定：直接回答？还是调用工具？
   ↓ 要调用
你的代码执行工具（查数据库、调 API、读传感器…）
   ↓
把结果回喂给模型
   ↓
[模型] 给出最终答复
```

## 三步，就这三步

**① 你把"工具清单"告诉模型** —— 一张用 JSON Schema 写的说明书：

```python
tools = [{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "查询某城市当前天气",
    "parameters": {
      "type": "object",
      "properties": {"city": {"type": "string", "description": "城市名"}},
      "required": ["city"],
    },
  },
}]
```

**② 模型决定调用哪个工具、带什么参数** —— 它输出的不是自然语言，而是一个结构化的 `tool_calls`：

```json
{"name": "get_weather", "arguments": {"city": "Beijing"}}
```

**③ 你的代码执行，再把结果喂回去**，模型据此给出人话答复。

## 30 行跑通

（用 OpenAI 兼容接口，DeepSeek 也行）

```python
import json, os
from openai import OpenAI

client = OpenAI(base_url="https://api.deepseek.com", api_key=os.environ["DEEPSEEK_API_KEY"])

def get_weather(city):           # 你自己写的真函数
    return {"Beijing": "晴 22°C", "Shanghai": "小雨 19°C"}.get(city, "未知")

TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "查询某城市当前天气",
        "parameters": {"type": "object",
                       "properties": {"city": {"type": "string"}},
                       "required": ["city"]},
    },
}]

def run(name, args):
    if name == "get_weather":
        return json.dumps(get_weather(args["city"]), ensure_ascii=False)
    return "unknown tool"

def agent(q):
    messages = [{"role": "user", "content": q}]
    while True:
        msg = client.chat.completions.create(
            model="deepseek-chat", messages=messages, tools=TOOLS
        ).choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            return msg.content                       # 没有工具调用 → 结束
        for call in msg.tool_calls:                  # 执行工具 → 回喂结果
            args = json.loads(call.function.arguments)
            messages.append({"role": "tool",
                             "tool_call_id": call.id,
                             "content": run(call.function.name, args)})

print(agent("北京现在天气怎么样？"))
```

看，**还是那个循环**：问模型 → 跑工具 → 回喂。

## 三个常见误区

1. **"模型执行了函数"** —— 没有。它只"说要调用什么"，**执行永远是你的代码**；
2. **"必须用官方 SDK"** —— 不必。Function Calling 只是**约定好的 JSON 格式**，你手写 HTTP 也能玩；
3. **"工具越多越好"** —— 反了。工具越多，模型越容易选错。**少而精、描述写清楚**才对。

## 和 MCP 什么关系？

一句话：**MCP = 标准化的 Function Calling。**

- Function Calling 解决"模型怎么要工具"；
- MCP 解决"工具怎么**跨应用复用**"（把工具变成独立进程）。

先懂这篇，再看 [用 30 行看懂 MCP](/posts/mcp-in-30-lines) 就顺了。

## 为什么这对嵌入式重要

因为"工具"不只是查天气——它可以 **读温度、控 GPIO、重启服务、刷固件**：

> **给模型一张工具清单，它就能"操作你的设备"。**

这就是"**边缘 Agent**"的起点：模型负责决策，工具负责碰硬件。下一篇我们聊怎么把 Agent 部署到 Jetson。

---

> 💬 你打算给 Agent 配什么工具？评论区聊聊。
> 🛠️ 需要**嵌入式 / 边缘 AI / Agent 定制与咨询**？见 [关于页](/about)。
