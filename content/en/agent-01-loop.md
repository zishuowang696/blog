---
title: "The core of an AI agent is just a loop"
summary: "Don't be intimidated by frameworks: an agent is a 'think → act → observe → think again' loop."
---

Many people think agents are complicated. The core is one **loop**:

1. Give the model the **question** and current context;
2. The model decides: **answer**, or **call a tool**;
3. If it calls a tool → run it → **feed the result back**;
4. **Repeat** until it gives a final answer.

That's it. Most "frameworks" just make this loop more convenient.

The fastest way to understand it is to **write it yourself** — you'll find the core is a few dozen lines.

Next: giving the model **hands** — tool calling.
