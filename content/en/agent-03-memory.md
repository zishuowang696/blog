---
title: "Short-term vs long-term memory"
summary: "Models have no memory — every call is a stranger; an agent's memory is whatever you feed back."
---

Models have no memory — **every call is a stranger**. An agent's memory is whatever you put back into the context.

Two kinds:

- **Short-term**: append the conversation history (simple; grows and costs more);
- **Long-term**: store key facts in a **vector store** and **retrieve** them when needed (cheaper, scales).

Rule of thumb: **start short-term**, add long-term when volume or cross-session recall demands it.

One line to remember:
> **Memory isn't "storing" — it's "retrieving next time".**
