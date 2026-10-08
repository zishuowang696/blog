---
title: "MCP in 30 lines: it's just standardized function calling"
summary: "MCP isn't magic: it's a JSON-RPC protocol that turns last post's hardcoded cat tool into a standalone process any LLM app can use. 30 lines of runnable server + client."
---

In the previous post, our `cat` tool was **hardcoded** inside the agent:

```python
# the tool lives inside your program
TOOLS = [{"function": {"name": "cat", "...": "..."}}]

def run_tool(name, args):
    ...
```

The problem is obvious: **switch apps and you rewrite it all.** A tool you wrote is only usable by you.

**MCP (Model Context Protocol) fixes exactly that — it turns a tool into a standalone process, exposed over one standard protocol that any LLM app can connect to.**

In one line: **MCP = standardized function calling.** It doesn't change the loop from the last post; it just standardizes *where tools come from and how they're called*.

## The three roles

- **Host**: the LLM app you use — Claude Desktop, Cursor, or your own agent.
- **Client**: a small piece inside the host that talks to the server (usually the host builds it for you).
- **Server**: **the part you write** — a process exposing Tools, Resources and Prompts.

The most common transport is **stdio**: the client launches the server process and they exchange **one JSON per line** (JSON-RPC) over stdin/stdout.

Some call it "USB-C for AI" — one port, any device.

## A 30-line MCP server

Turn last post's `cat` into an MCP server (`server.py`):

```python
import json, subprocess, sys

TOOLS = [{
    "name": "cat",
    "description": "Read the full contents of a file",
    "inputSchema": {
        "type": "object",
        "properties": {"path": {"type": "string", "description": "file path"}},
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
    if "id" not in req:      # a notification — no reply needed
        continue
    res = handle(req)
    sys.stdout.write(json.dumps({"jsonrpc": "2.0", "id": req["id"], "result": res}) + "\n")
    sys.stdout.flush()
```

That's it. **An MCP server is just "read a JSON line → dispatch by method → write a JSON line".**

## A 30-line client

A client does three things: **handshake → list tools → call** (`client.py`):

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
rpc("notifications/initialized", notify=True)          # handshake done

print("tools:", rpc("tools/list"))
print("call:", rpc("tools/call", {"name": "cat", "arguments": {"path": "/etc/hostname"}}))
```

Run it:

```bash
python client.py
# tools: {'tools': [{'name': 'cat', ...}]}
# call: {'content': [{'type': 'text', 'text': 'your-hostname'}]}
```

## vs. the last post

| | Last post (hardcoded) | This post (MCP) |
| --- | --- | --- |
| Tool definition | lives in the agent code | standalone process, declared via `tools/list` |
| Tool invocation | a direct function call | `tools/call` JSON-RPC |
| Who can use it | only you | **any MCP-capable host** |

**Nothing essential changed**: still the loop **"ask the model → run the tool → feed the result back."** MCP just standardizes the *tool*, so what you write is reusable by any LLM app — **swap the model, plug in tools, keep the loop.**

> 📦 Complete runnable code: **[github.com/zishuowang696/mcp-demo](https://github.com/zishuowang696/mcp-demo)**
>
> 💬 Questions or feedback? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696/mcp-demo/issues) on GitHub.
