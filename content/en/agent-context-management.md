---
title: "Agent messages keep growing — how to keep context under control"
summary: "Run an agent for a while and the messages array balloons: token cost explodes, it gets slow, and eventually it overflows the context window. Not a small issue — the #1 engineering problem in production agents. 6 fixes + runnable code."
---

In the previous post we said [an agent is just a loop](/en/posts/function-calling-explained): **ask the model → run the tool → feed it back**.

Run it for a while and you'll hit a hidden trap:

> **The messages array keeps growing.**

Every turn you append: the user message, the assistant message, **every tool result**… A few dozen turns later:

- **Token cost explodes** → expensive and slow;
- A bit longer → **you blow past the context window and it errors out**.

This isn't a small issue — it's **the #1 engineering problem in production agents**. Here's why it happens and a few fixes that actually work.

## Why it always grows

```
system prompt
+ user message
+ [assistant message + tool result] × N   ← appended every turn, never reclaimed
```

The problem: **you only ever add, never remove.** And tool results are usually the biggest part (a single `cat` of a log can be 100KB).

## 6 fixes, from simple to advanced

### 1. Don't dump big results into messages (biggest win, most ignored)
Tool returned 100KB of logs? **Don't feed it back raw.** Feed back a **summary / the first N lines**, write the raw data to disk, query it later if needed.

> Rule: **every byte that enters messages costs you tokens.**

```python
def run_tool_safely(out, limit=2000):
    if len(out) > limit:
        return out[:limit] + f"\n…(truncated, {len(out)} chars total, saved to file)"
    return out
```

### 2. Sliding-window trimming
Keep `system` + the **last K turns**, drop the rest. Blunt but effective.

```python
def trim(messages, keep=12):
    head = [m for m in messages if m.get("role") == "system"]
    return head + messages[-keep:]
```

### 3. Rolling summary (recommended)
Before dropping, let the model **compress the soon-to-be-dropped history** into a paragraph, replacing the raw messages. Small window, information preserved.

```python
def compact(messages, keep=8):
    if len(messages) <= keep:
        return messages
    old, recent = messages[:-keep], messages[-keep:]
    summary = summarize(old)                 # let the model summarize `old`
    return [{"role": "system", "content": f"Earlier conversation summary: {summary}"}] + recent
```

### 4. Structured memory
Extract **facts / preferences / conclusions** from the conversation into a small doc or key-value store (e.g., "user is working on a Jetson edge gateway"), and inject them when needed.

> **Memory ≠ full history.** Remember the *points*, not the *play-by-play*.

### 5. Retrieval-based memory (RAG)
Store history externally (vector DB / files) and **retrieve relevant chunks on demand** instead of stuffing everything into context.

### 6. Sub-agents / context isolation
Let a **sub-agent do the dirty work in its own context** and return **only the result** to the main agent. Contexts don't share, so they don't balloon together.

## How to choose

| Your scenario | Use |
| --- | --- |
| One-off short tasks | sliding-window trimming |
| Long conversations | rolling summary |
| Must remember user facts / prefs | structured memory |
| Long history + precise recall | retrieval memory (RAG) |
| Complex multi-step tasks | sub-agent isolation |

## Why this matters even more on the edge

Local / edge models have smaller context (often just **8K–32K**).

> In the cloud, message management is an **optimization**. On the edge, it's **whether it runs at all**.

## The takeaway

One line to remember:

> **Context is a budget, not a warehouse.** Every turn, ask: does this history still earn its place?

**Drop when you can, compress when you can, externalize when you can.**
