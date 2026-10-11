---
title: "Agent development is really 'client development'"
summary: "After a few days learning agents, my conclusion: it's essentially 'client development + one LLM API call.' If you've done Android/frontend/desktop clients, add MCP and a few LLM concepts and you can interview for agent roles directly — don't be scared by the word 'AI'."
---

After a few days seriously learning agents, one feeling keeps growing:

> **Agent development is really the old client development — just wired to an LLM API.**

It looks like "AI", but pull it apart and it's all work you've done.

## Take an agent apart

| Concept in agents | What it really is (client view) |
| --- | --- |
| LLM API call | **Calling a backend API** (HTTP + JSON) |
| The "loop" (ask model → run tool → feed back) | **Event loop / state machine** (stateful request-response) |
| Function calling / Tools | **API integration**: call, handle response, retry |
| MCP (client / server) | **RPC / network layer**: client talks to server |
| Memory / session | **Local state / cache** |
| Prompt | **Config / protocol convention** |
| Streaming output | **Streaming response / incremental render** (you've written this) |

**None of it is a new species.** They're all old friends of client engineering, renamed.

## So who can switch most easily

- **Android / iOS / desktop clients**: main loop, state management, networking, concurrency — all your daily work;
- **Frontend**: request-response, state, rendering, async — same idea.

They only need to add **two new things**:

1. **MCP** (a protocol — see "Write a standard MCP client" and you're set);
2. **Basic LLM concepts** (token, context, temperature, function calling).

**That's it.** After that, putting "built agents" on your résumé isn't a stretch at all.

## But don't oversimplify (honestly)

A few things are **genuinely new** and outside client experience:

- **Non-determinism**: the model isn't a deterministic API — same input, different output, wrong answers, confident nonsense;
- **Prompt / context engineering**: wording and context directly change results;
- **Evaluation**: proving "it's better now" (the most new-feeling part);
- **Cost / latency / tokens**: calling a model costs money and time;
- **Safety**: **tools really execute** (delete files, send requests) — far bigger blast radius than a read-only API.

But these are **additions**, not starting from zero. The traps you hit in client work are still there, just in a new setting.

## The shortest path for switchers (a week or two)

1. Get a minimal agent running ("Build an AI agent from scratch");
2. Understand **MCP** (client + server, write it once);
3. Get **function calling / tokens / context**;
4. Build one small project (e.g. an assistant that reads system state) and put it on GitHub;
5. **Go interview.**

## In one line

**An agent isn't a new species — it's "old client development + a new (non-deterministic) brain."**

Android and frontend folks: **don't be scared off by the word 'AI'** — what you lack isn't ability, it's the "done it once" experience, and that takes **a week or two.**

> 💬 What do you think — is an agent just client development? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696) to talk.

*（Bilingual post.）*
