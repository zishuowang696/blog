---
title: "Write a standard MCP client by hand (no server needed)"
summary: "The MCP spec decides how the client is written. No server here — just 40 lines of stdlib for a standard MCP client: handshake → read capabilities → tools/list → tools/call. Works with any MCP server."
---

The previous post covered the agent loop; now we enter **MCP**.

Most people get stuck on the same question: **what exactly is the MCP standard?** — because **the spec directly decides how the client is written**. So this post writes **no server**. It does one thing: explain the MCP standard, then implement a **standard MCP client** in stdlib code that can connect to **any** MCP server.

## What the MCP standard actually is

In one line:

> **MCP = a JSON-RPC 2.0 protocol**: it defines *which methods exist*, *what messages look like*, and *how the handshake and capability negotiation work*. stdio / HTTP are just the **transport** beneath it.

### 1) Message shapes (JSON-RPC 2.0)

- **Request**: `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{...}}`
- **Response**: `{"jsonrpc":"2.0","id":1,"result":{...}}` (or `error`)
- **Notification**: `{"jsonrpc":"2.0","method":"notifications/initialized"}` (**no `id`**, no reply expected)

### 2) Lifecycle: one handshake

1. client → `initialize` (with `protocolVersion`, `capabilities`, `clientInfo`);
2. server → returns its `capabilities` and `serverInfo` (**version mismatch is negotiated or errors**);
3. client → `notifications/initialized` (handshake done).

Only then do real calls begin.

### 3) Capability negotiation — **the key**

During the handshake both sides **declare what they support**, which decides which methods you may call:

| Provided by | Capability | Methods |
| --- | --- | --- |
| **server** → client | **tools** | `tools/list`, `tools/call` |
| | **resources** | `resources/list`, `resources/read` |
| | **prompts** | `prompts/list`, `prompts/get` |
| **client** → server | sampling | `sampling/createMessage` |
| | roots | `roots/list` |

> **How to write a client = handshake → read the server's capabilities → call only the methods it declared.**

## Implementation: a standard MCP client

Transport is **stdio** (launch the server as a child, read/write its stdin/stdout). The core is one `MCPClient` class:

```python
import json, subprocess

class MCPClient:
    def __init__(self, cmd):
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
        msg = {"jsonrpc": "2.0", "method": method}       # notification: no id
        if params is not None: msg["params"] = params
        self._send(msg)

    def initialize(self, protocol_version="2024-11-05"):
        result = self._request("initialize", {
            "protocolVersion": protocol_version,
            "capabilities": {},
            "clientInfo": {"name": "mini-mcp-client", "version": "0.1"},
        })
        self.capabilities = result.get("capabilities", {})
        self._notify("notifications/initialized")
        return result

    def list_tools(self):
        return self._request("tools/list").get("tools", [])

    def call_tool(self, name, arguments):
        return self._request("tools/call", {"name": name, "arguments": arguments})
```

**What it does** (mapped to the standard):
1. **Transport**: spawn a child + pipe I/O;
2. **Handshake**: `initialize` → get `capabilities` → `notifications/initialized`;
3. **Calls**: `tools/list` to discover tools → `tools/call` to run one.

## Run it (against any server)

```bash
python client.py python3 ../mcp-demo/server.py
```

```
handshake ok, serverInfo = {'name': 'cat-mcp', 'version': '0.1'}
server capabilities = ['tools']
tools = ['cat']
call cat -> {'content': [{'type': 'text', 'text': 'your-hostname'}]}
```

**Note: there is no "our server" here** — the client only expects "a server that satisfies the MCP standard". Point it at any stdio MCP server and the same client works.

## Common pitfalls

1. **Notifications have no `id`**: don't wait for a reply to `notifications/initialized`.
2. **Match responses by `id`**: correlate by `id` (this example is serial for simplicity).
3. **Call only declared methods**: if the server declares no `resources`, don't call `resources/list`.
4. **Negotiate `protocolVersion`**: a mismatch errors; don't hardcode blindly.
5. **Servers send messages proactively** (progress, logs, sampling requests): a real client dispatches them; this example just skips them.

## In one line

**MCP = JSON-RPC 2.0 + a set of defined methods + handshake/capability negotiation.** Understand that, and **a client is three steps: handshake → read capabilities → call the right methods** — independent of stdio vs HTTP.

The next post switches to the **server** side: also 30 lines, exposing a tool over MCP.

> 📦 Complete runnable code: **[github.com/zishuowang696/mcp-client](https://github.com/zishuowang696/mcp-client)**
>
> 💬 Questions or feedback? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696/mcp-client/issues) on GitHub.
