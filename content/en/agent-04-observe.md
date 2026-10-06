---
title: "Why an agent must be observable"
summary: "Agents are non-deterministic; if you can't see each step, you can't debug."
---

Agents are **non-deterministic**: same input, different paths.

So — **if you can't see each step, you can't debug**. Observability should show at least:

- each **model decision** (which tool it wants, what it says);
- each **tool call** — arguments and result;
- where **time is spent or failures** happen.

Without it, you're guessing.

One line:
> **Debugging an agent is really about reading its trace.**
