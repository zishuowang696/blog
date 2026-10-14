---
title: "MCP 的「客户端」到底在哪？你没写它，却一直在用它"
date: 2026-10-14
tags: [mcp, ai-agent, tutorial, protocol]
summary: "很多人被 MCP 的 Host / Client / Server『三件套』搞懵：不是说要写 client 吗？可我看别人只写了 server，opencode / Cursor 一连就能跑。其实——client 一直在，只是藏在 Host 里，对你透明。"
series: "从 0 构建 AI Agent"
published: true
---

学 MCP 的人，几乎都会卡在同一个疑惑：

> **"不是说要 Client 吗？可我根本没写 client，`opencode` / Cursor 一连 Playwright 就跑了——client 呢？"**

先给结论：

> **Client 一直在。它藏在 Host 里，对你透明——所以你"感觉不到"。**

## 那个"三件套"到底谁是谁

MCP 有 **Host / Client / Server** 三个角色，很多人一看就懵："我要写几个？"

| 角色 | 是什么 | 谁来写 |
| --- | --- | --- |
| **Host** | 你的 LLM 应用（opencode / Cursor / Claude Desktop / 你自己的 agent） | 框架提供 |
| **Client** | Host **内部的一小块**，负责连 server、握手、调方法 | **框架内置**（你不用写） |
| **Server** | 暴露工具的那个进程 | **你写** |

**关键**：**Client 不是独立程序，它是 Host 的一部分。**

## 你没写 client，那谁在干？

你在配置里写一行：

```jsonc
"mcp": { "playwright": { "command": ["node", ".../cli.js"] } }
```

这**只是告诉 Host**："去启动 / 连这个 server"。之后的：

```
[Host 内置的 Client]  →  initialize 握手
                      →  tools/list 拉工具
                      →  tools/call 调工具
                      →  把结果回喂给模型
```

**全是 Host 内置的 client 在干。** 你**一直在用 client**，只是它对你**透明**（因为它在框架里）。

## 一个类比

**浏览器连网站，你从不用自己写 TCP/IP 栈** —— 因为栈**内置在浏览器里**。

> **MCP Client 之于 Host，就像 TCP 栈之于浏览器。**

你配的是"连哪个网站"（server），不是"怎么写 TCP"（client）。

## 所以"三件套"的正确读法

- **Host（框架）= 自带 client + 配置驱动**；
- **Server = 你写的工具**；
- **Client = 框架的，你看不见、也不该你写**。

**你实际只需要两样**：**写 server + 填一行配置。**

## 那什么时候你真要写 client？

> **当 Host 是你自己的程序时。**

比如你从 0 自研一个 agent——那时**没有现成的 client**，你得自己塞一个进去（或用 MCP 客户端库）。这就是 [手写一个标准的 MCP 客户端](/posts/write-an-mcp-client) 存在的意义。

## 一句话记住

> **MCP 永远有一个 client。区别只是——"Host 自带"，还是"你自己写"。**

大多数人被"三件套"唬住，以为要写三个东西；其实——

> **你只写 server（+ 一行配置）。Client，框架替你写好了。**

---

> 💬 你学 MCP 的时候，被"client"绕进去过吗？
> 🛠️ 需要嵌入式 / 边缘 AI / Agent 定制与咨询？见 [关于页](/about)。
