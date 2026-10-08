---
title: "Building an AI agent from scratch: the core is 20 lines"
summary: "Strip away the frameworks and an agent is a loop plus a set of tools. Understand this 20-line skeleton and you understand the kernel of every agent framework."
---

New agent frameworks appear every month, which makes it easy to assume there's something deep inside. **There isn't.** Strip away the packaging and an agent is the 20 lines below.

## The core: a loop

```python
import json

TOOLS = {
    "get_temp": lambda: {"temp": 42},        # your real function
}

def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        reply = llm(messages, tools=TOOLS)   # 1. ask the model
        messages.append(reply)
        if not reply.get("tool_calls"):      # 2. no tool needed -> answer
            return reply["content"]
        for call in reply["tool_calls"]:     # 3. actually run the tools
            result = TOOLS[call["name"]]()
            messages.append({"role": "tool", "content": json.dumps(result)})
```

Every iteration does three things: **ask the model → run the tool it asked for → feed the result back**, until the model gives a final answer.

Every "framework" — LangChain, AutoGen, all of them — **is just this loop wrapped more conveniently**: logging, memory, concurrency, a UI. The kernel never changes.

Once that clicks, the other four ideas are easy.

## 1. Tool calling: the model decides, your code executes

A model can talk, not act. **Tool calling** hands it the ability to do things: you tell it the function **names and parameters**; it decides **which one and with what arguments**; **your code actually runs it** and feeds the result back.

The key line: **the model executes nothing**. It only emits "call `get_temp()`". **Your code always does the work** — that's your safety boundary, and the reason "give the model a clean pair of hands" beats "give it a hundred tools."

> Don't hoard tools. **Start with three you truly need.**

## 2. Memory: paste it short, retrieve it long

Models **have no memory** — every call is a stranger. An agent's "memory" is just the context **you choose to feed back**:

- **Short-term**: append the conversation. Simple, but it grows and costs more.
- **Long-term**: store key facts in a **vector store** and **retrieve** them when needed. Cheaper, and it scales.

**Start short-term**; add long-term when volume or cross-session recall demands it.

One line to keep: **memory isn't "storing" — it's "retrieving next time."**

## 3. Observability: debugging an agent means reading its trace

Models are **non-deterministic**: the same input can take completely different paths. So **if you can't see each step, you can't debug at all.**

You need, at minimum: each **model decision**, each **tool call** with its arguments and result, and where **time and failures** go.

> **Debugging an agent is reading its execution trace.**

## 4. Local models: offline, private, edge-ready

Agents don't need the cloud. Run them locally with **Ollama**: **free, offline, private** — and it fits **edge devices** (small models run on a Jetson). Most frameworks speak Ollama's unified API; point `base_url` at localhost.

One lesson: **small models are weak at tool calling.** So the order is — **get the loop working on a strong model first, then size down.**

## Next: make it *your* agent

Once you understand those 20 lines, you only need to do one thing: **give it a tool of your own.**

Add a `get_device_temp()` — a plain function that reads a board's temperature. The moment the model learns to "check the temperature first, then decide whether to throttle," you've taken the first step toward a **self-maintaining device agent**.

---

**In one line**: an agent = **a loop plus tools**; memory makes it remember, observability makes it debuggable, a local model makes it deployable. **Frameworks change — the kernel doesn't.**
