---
title: "用 30 行看懂 MCP：它其实就是标准化的 Function Calling"
date: 2026-10-09
tags: [mcp, ai-agent, function-calling, 智能体, 教程]
summary: "MCP 不神秘：它就是一套基于 JSON-RPC 的协议，把上一篇硬编码的 cat 工具变成一个独立进程，让任何 LLM 应用都能接。附 30 行可跑的服务端和客户端。"
series: "从 0 构建 AI Agent"
published: true
---

在《从 0 构建一个 AI Agent》里，我们的 `cat` 工具是**硬编码**在 Agent 代码里的：

```python
# 工具写死在你的程序里
TOOLS = [{"function": {"name": "cat", "...": "..."}}]

def run_tool(name, args):
    ...
```

问题很明显：**换个应用就得重写一遍**。你写的工具，只能给你自己用。

**MCP（Model Context Protocol）解决的就是这件事——把工具变成一个独立进程，用一套标准协议对外暴露，任何 LLM 应用都能接。**

一句话：**MCP = 标准化的 Function Calling。** 它不改变上一篇那个循环，只是把"工具从哪来、怎么调"这件事标准化了。

## MCP 的三个角色

- **Host（宿主）**：你用的 LLM 应用，比如 Claude Desktop、Cursor，或你自己的 Agent。
- **Client（客户端）**：Host 内部的一小块，负责和 Server 通信（通常 Host 已经帮你建好）。
- **Server（服务端）**：**你要写的东西**——一个进程，对外暴露工具（Tools）、资源（Resources）、提示（Prompts）。

最常见的传输方式是 **stdio**：客户端启动服务端进程，用**每行一个 JSON**（JSON-RPC）在标准输入输出上：一问一答。

有人叫它"AI 界的 USB-C"——一个标准口，插什么设备都能通。

## 30 行写一个 MCP 服务端

把上一篇的 `cat` 变成一个 MCP Server（`server.py`）：

```python
import json, subprocess, sys

TOOLS = [{
    "name": "cat",
    "description": "读取一个文件的全部内容",
    "inputSchema": {
        "type": "object",
        "properties": {"path": {"type": "string", "description": "文件路径"}},
        "required": ["path"],
    },
}]

def handle(msg):
    m = msg["method"]
    if m == "initialize":
        return {"protocolVersion": msg["params"]["protocolVersion"],
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "cat-mcp", "version": "0.1"}}
    if m == "tools/list":
        return {"tools": TOOLS}
    if m == "tools/call":
        path = msg["params"]["arguments"]["path"]
        out = subprocess.run(["cat", path], capture_output=True, text=True)
        return {"content": [{"type": "text", "text": out.stdout or out.stderr}]}
    return {}

for line in sys.stdin:
    req = json.loads(line)
    if "id" not in req:      # 通知（notification），不需要回
        continue
    res = handle(req)
    sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": req["id"], "result": res}) + "\n")
    sys.stdout.flush()
```

就这些。**MCP 服务端就是"读一行 JSON → 分发方法 → 写一行 JSON"。**

## 30 行写一个客户端

客户端只做三件事：**握手 → 列工具 → 调用**（`client.py`）：

```python
import json, subprocess, sys

proc = subprocess.Popen([sys.executable, "server.py"],
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
_id = 0

def rpc(method, params=None, notify=False):
    global _id
    msg = {"jsonrpc": "2.0", "method": method}
    if params is not None:
        msg["params"] = params
    if not notify:
        _id += 1
        msg["id"] = _id
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()
    return None if notify else json.loads(proc.stdout.readline())

rpc("initialize", {"protocolVersion": "2024-11-05", "capabilities": {},
                   "clientInfo": {"name": "demo", "version": "0.1"}})
rpc("notifications/initialized", notify=True)          # 握手完成

print("工具列表:", rpc("tools/list"))
print("调用结果:", rpc("tools/call", {"name": "cat", "arguments": {"path": "/etc/hostname"}}))
```

跑一下：

```bash
python client.py
# 工具列表: {'tools': [{'name': 'cat', ...}]}
# 调用结果: {'content': [{'type': 'text', 'text': 'your-hostname'}]}
```

## 和上一篇对照

| | 上一篇（硬编码） | 这一篇（MCP） |
| --- | --- | --- |
| 工具定义 | 写在 Agent 代码里 | 独立进程，用 `tools/list` 声明 |
| 工具调用 | 直接函数调用 | `tools/call` JSON-RPC |
| 谁能用 | 只有你自己 | **任何支持 MCP 的 Host** |

**本质没变**：还是"**问模型 → 执行工具 → 回喂结果**"那个循环。MCP 只是把"工具"标准化，让你写的工具能被任何 LLM 应用复用——**模型可换、工具可插，循环不变。**

> 📦 完整可运行代码：**[github.com/zishuowang696/mcp-demo](https://github.com/zishuowang696/mcp-demo)**
>
> 💬 有问题或建议？**在下方评论**，或到 GitHub [提 Issue](https://github.com/zishuowang696/mcp-demo/issues)。

*（本文中英双语；本系列记录从 0 构建 Agent 的过程。）*
