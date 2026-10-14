---
title: "Where is MCP's client? You never wrote it — but you're using it"
summary: "Most people get stuck on MCP's Host / Client / Server trio: 'Aren't I supposed to write a client? But I only see people writing a server, and opencode / Cursor just connect and work.' The truth: the client is always there — it's tucked inside the host, transparent to you."
---

Almost everyone learning MCP hits the same confusion:

> **"Aren't you supposed to have a Client? But I never wrote one, and `opencode` / Cursor just connect to Playwright and it works — where's the client?"**

Here's the answer up front:

> **The client is always there. It's tucked inside the Host — transparent to you, which is why you never "feel" it.**

## Who's who in the "trio"

MCP has three roles — **Host / Client / Server** — and people immediately ask: "How many do I write?"

| Role | What it is | Who writes it |
| --- | --- | --- |
| **Host** | your LLM app (opencode / Cursor / Claude Desktop / your own agent) | the framework |
| **Client** | a **piece inside the Host** that connects the server, handshakes, calls methods | **built into the framework** (you don't) |
| **Server** | the process exposing tools | **you write it** |

**Key point**: **the Client is not a standalone program — it's part of the Host.**

## If you didn't write the client, who's doing the work?

You write one line of config:

```jsonc
"mcp": { "playwright": { "command": ["node", ".../cli.js"] } }
```

That **just tells the Host**: "launch / connect this server." After that:

```
[Client built into the Host]  →  initialize handshake
                              →  tools/list (fetch tools)
                              →  tools/call (invoke tool)
                              →  feed the result back to the model
```

**It's all the Host's built-in client.** You've been using a client all along — it's just **transparent**, because it lives in the framework.

## An analogy

**A browser connects to websites without you ever writing a TCP/IP stack** — because the stack is **built into the browser**.

> **MCP's Client is to a Host what the TCP stack is to a browser.**

What you configure is "which site to connect to" (the server), not "how to write TCP" (the client).

## The right way to read the "trio"

- **Host (framework) = built-in client + config-driven**;
- **Server = the tool you write**;
- **Client = the framework's, invisible, and not yours to write.**

**You really only need two things**: **write the server + add one config line.**

## So when *do* you write a client?

> **When the Host is your own program.**

E.g., if you're building an agent from scratch — then **there's no ready-made client**, and you have to put one in yourself (or use an MCP client library). That's exactly why [writing a standard MCP client by hand](/en/posts/write-an-mcp-client) exists.

## Remember one line

> **MCP always has a client. The only question is: does the Host ship it, or do you write it?**

Most people get scared by the "trio" and think they must write three things. In reality:

> **You write the server (+ one config line). The client is already done for you.**
