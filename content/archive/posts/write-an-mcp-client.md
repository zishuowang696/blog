---
title: "手写一个标准的 MCP 客户端（不用自己写服务端）"
date: 2026-10-08
tags: [mcp, ai-agent, 协议, 客户端, 教程]
summary: "MCP 标准决定了 client 怎么写。这篇不写服务端，只用 40 行标准库实现一个标准的 MCP 客户端：握手 → 读 capabilities → tools/list → tools/call，可连接任意 MCP server。"
series: "从 0 构建 AI Agent"
published: true
---

上一篇《从 0 构建一个 AI Agent》讲了 Agent 的循环；这一篇进入 **MCP**。

很多人卡在同一个地方：**MCP 标准到底是什么？**——因为**它的规范直接决定了 client 怎么写**。所以这篇**不写服务端**，只干一件事：讲清 MCP 标准，并用一段标准库代码**实现一个标准的 MCP 客户端**，它能连接**任意** MCP server。

## MCP 标准到底是什么

一句话：

> **MCP = 基于 JSON-RPC 2.0 的协议**：它规定"**有哪些方法**、**消息长什么样**、**怎么握手与能力协商**"。至于 stdio / HTTP，只是承载它的**传输**。

### 1）消息形态（JSON-RPC 2.0）

- **请求**：`{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{...}}`
- **响应**：`{"jsonrpc":"2.0","id":1,"result":{...}}`（出错则是 `error`）
- **通知**：`{"jsonrpc":"2.0","method":"notifications/initialized"}`（**没有 `id`**，不需要回）

### 2）生命周期：一次握手

1. client → `initialize`（带 `protocolVersion`、`capabilities`、`clientInfo`）；
2. server → 返回它支持的 `capabilities` 与 `serverInfo`（**版本不一致会协商或报错**）；
3. client → `notifications/initialized`（握手完成）。

之后才进入真正的调用。

### 3）能力协商（capabilities）——**关键**

握手时双方**各自声明支持什么**，这决定了后面能用哪些方法：

| 谁提供 | 能力 | 相关方法 |
| --- | --- | --- |
| **server** → client | **tools** | `tools/list`、`tools/call` |
| | **resources** | `resources/list`、`resources/read` |
| | **prompts** | `prompts/list`、`prompts/get` |
| **client** → server | sampling | `sampling/createMessage` |
| | roots | `roots/list` |

> **client 怎么写 = 握手 → 看 server 声明了哪些 capabilities → 只调它声明支持的方法。**

## 实现：一个标准的 MCP 客户端

传输用 **stdio**（把 server 当子进程拉起，读写它的 stdin/stdout），核心就一个 `MCPClient` 类：

```python
import json, subprocess

class MCPClient:
    def __init__(self, cmd):
        # 传输：把 server 作为子进程拉起，用 stdin/stdout 收发一行行 JSON-RPC
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        self._id = 0
        self.capabilities = {}

    def _send(self, obj):
        self.proc.stdin.write(json.dumps(obj) + "\n"); self.proc.stdin.flush()

    def _request(self, method, params=None):
        self._id += 1
        msg = {"jsonrpc": "2.0", "id": self._id, "method": method}
        if params is not None: msg["params"] = params
        self._send(msg)
        while True:
            resp = json.loads(self.proc.stdout.readline())
            if resp.get("id") == self._id and ("result" in resp or "error" in resp):
                if "error" in resp: raise RuntimeError(resp["error"])
                return resp["result"]

    def _notify(self, method, params=None):
        msg = {"jsonrpc": "2.0", "method": method}       # 通知：没有 id
        if params is not None: msg["params"] = params
        self._send(msg)

    def initialize(self, protocol_version="2024-11-05"):
        result = self._request("initialize", {
            "protocolVersion": protocol_version,
            "capabilities": {},                           # 本客户端不额外提供能力
            "clientInfo": {"name": "mini-mcp-client", "version": "0.1"},
        })
        self.capabilities = result.get("capabilities", {})
        self._notify("notifications/initialized")         # 握手完成
        return result

    def list_tools(self):
        return self._request("tools/list").get("tools", [])

    def call_tool(self, name, arguments):
        return self._request("tools/call", {"name": name, "arguments": arguments})
```

**它做了什么**（对着上面的标准）：
1. **传输**：spawn 子进程 + 管道收发；
2. **握手**：`initialize` → 拿 `capabilities` → `notifications/initialized`；
3. **调用**：`tools/list` 发现工具 → `tools/call` 执行。

## 跑起来（连任意 server）

```bash
# 连一个现成的 stdio MCP server（这里用姊妹仓库的示例）
python client.py python3 ../mcp-demo/server.py
```

```
handshake ok, serverInfo = {'name': 'cat-mcp', 'version': '0.1'}
server capabilities = ['tools']
tools = ['cat']
call cat -> {'content': [{'type': 'text', 'text': 'your-hostname'}]}
```

**注意：这里没有"我们的服务端"**——client 只认"**一个能满足 MCP 标准的 server**"。换成任何 stdio MCP server，同一份 client 都能接。

## 几个容易踩的点

1. **通知没有 `id`**：`notifications/initialized` 这类**不用回**；别把通知当请求等响应。
2. **响应靠 `id` 匹配**：并发请求时按 `id` 对上；本示例串行最简单。
3. **只调声明的方法**：server 没声明 `resources`，就别调 `resources/list`。
4. **`protocolVersion` 要协商**：握手时对不上会报错，别硬写死。
5. **服务端会主动发消息**（进度、日志、sampling 请求）：真实 client 要**分流处理**，本示例为简洁只跳过。

## 一句话收尾

**MCP 标准 = JSON-RPC 2.0 + 一组约定方法 + 握手/能力协商**。搞懂它，**client 就是三步：握手 → 读 capabilities → 调对应方法**——和具体是 stdio 还是 HTTP 无关。

下一篇《用 30 行看懂 MCP》换到**服务端**视角：同样 30 行，把工具"挂"到 MCP 上。

> 📦 完整可运行代码：**[github.com/zishuowang696/mcp-client](https://github.com/zishuowang696/mcp-client)**
>
> 💬 有问题或建议？**在下方评论**，或到 GitHub [提 Issue](https://github.com/zishuowang696/mcp-client/issues)。

*（本文中英双语；本系列记录从 0 构建 Agent 的过程。）*
