---
title: "Why does MCP mostly use pipes (stdio), rarely sockets?"
summary: "MCP mostly uses stdio not because pipes are superior, but because most current scenarios are the sweet spot for pipes: local, single client, one-shot, light and stateless. Once it becomes multi-client/always-on/stateful, switch to a socket."
---

Following up on the previous post [MCP in 30 lines](/en/posts/mcp-in-30-lines). Systems people often ask:

> **Why does MCP use pipes (stdio) instead of sockets?**

Bottom line: **it's not that pipes are superior — it's that most current MCP scenarios happen to be the sweet spot for pipes**: **local, single client, one-shot, light and stateless**. Once it becomes "**multi-client / always-on / stateful / heavy**", switch to a socket.

## MCP is a protocol; the transport is pluggable

The message format (JSON-RPC) and "which wire carries it" are **two different things**:

| Transport | Over | Scenario |
| --- | --- | --- |
| **stdio** | **pipe** (stdin/stdout) | local server the client launches |
| **HTTP / SSE (Streamable HTTP)** | **TCP socket** | remote / multi-client |

Same protocol, two ways to wire it.

## Pipe vs socket: the difference is semantic weight

| | Pipe (stdio) | Local socket |
| --- | --- | --- |
| Address/name | ❌ anonymous | ✅ path / `127.0.0.1:port` |
| Connection semantics | ❌ just two fds | ✅ listen/accept/connect |
| Clients | **1:1** | **1:N** |
| Lifetime | tied to parent/child | server can be always-on |
| Reconnect / auth | ❌ / ❌ | ✅ / ✅ |
| Kernel overhead | minimal | slightly more |

Note: **both are local, zero-network**; the data path is "kernel buffer + memory copy" in both, so **performance is very close** — the difference is **semantics**, not speed.

## The test isn't "local vs remote" — it's these three questions

1. **How many clients?** 1 → stdio; many → socket.
2. **Always-on / reconnectable?** yes → socket.
3. **Stateful? Heavy?** either → socket.

> A common mistake: "services should be stateless, so #3 can be ignored?"
> No. **Statelessness removes *state*, not *cost*.** Even a fully stateless service still pays the physical cost of "loading a model once / opening an expensive connection." If every stdio client forks its own copy, you **pay that cost repeatedly** — a **resource-reuse** problem, unrelated to whether it has state.

## So why is stdio dominant today?

Because most MCP scenarios land squarely in stdio's sweet spot:

- **Desktop AI (Claude Desktop, Cursor…)** is literally "launch one local tool" — inherently 1:1;
- **Tools are mostly stateless and light** (read a file, look something up, run a command) — multiple processes are fine;
- **stdio has zero network surface**: no ports, no firewall, **no auth, no config**, simplest cross-platform;
- **Secure**: process isolation, minimal attack surface.

In one line: **the scenario matches** — not superiority.

## When should you use a socket?

- Multiple apps/agents want to **share** one tool service;
- The service must be **always-on** (start on boot, restart on crash, independent of clients);
- The tool is **heavy** (e.g. a **local model** inference server) — you don't want to load it per client;
- You need **session state** (multi-turn, a held device/serial handle, streaming);
- You need **auth / monitoring / remote access**.

> MCP has no native **UNIX socket** transport; for "local socket semantics", use the **HTTP transport bound to `127.0.0.1`** (= loopback TCP, local but not exposed), or roll your own over a UNIX socket.

## From an edge-gateway view (my case)

- **A single agent launching a light tool** → **stdio** is enough, and cheapest;
- **An always-on, expensive "device capability service"** (used by agent, CLI, and web; especially one that **loads a model**) → **don't use stdio**; use a **local socket (HTTP bound to `127.0.0.1`)** to avoid "one process per client, reloading the model each time".

## In one line

**It's not that pipes are better — they just match most scenarios today.** The test was never "local vs remote", but: **how many clients, always-on or not, stateful/costly or not.** Change the scenario, change to a socket.

> 📦 Related code: **[github.com/zishuowang696/mcp-demo](https://github.com/zishuowang696/mcp-demo)**
>
> 💬 Questions or feedback? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696/mcp-demo/issues) on GitHub.
