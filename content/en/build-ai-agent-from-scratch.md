---
title: "Building an AI agent from scratch: the core is ~20 lines"
summary: "Strip away the frameworks and an agent is a loop plus a set of tools. One 'cat' tool and one complete runnable example explain the kernel of every agent framework."
---

New agent frameworks appear every month, which makes it easy to assume there's something deep inside. **There isn't.** Strip away the packaging and an agent is a loop plus a set of tools.

Here is a **complete, runnable** minimal agent — with the most ordinary tool of all: `cat`.

## The complete code

```python
import json, subprocess
from openai import OpenAI

# Point at local Ollama (or any OpenAI-compatible API); switch providers here only
client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

# 1) Tool definition: tell the model which functions exist and their parameters
TOOLS = [{
    "type": "function",
    "function": {
        "name": "cat",
        "description": "Read the full contents of a file",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "file path"},
            },
            "required": ["path"],
        },
    },
}]

# 2) Tool implementation: the code that actually does the work
#    (the model executes nothing — your code executes)
def run_tool(name, args):
    if name == "cat":
        return subprocess.run(
            ["cat", args["path"]], capture_output=True, text=True
        ).stdout
    return f"unknown tool: {name}"

# 3) The agent loop: ask -> run tools -> feed results back -> repeat
def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        reply = client.chat.completions.create(
            model="qwen2.5", messages=messages, tools=TOOLS
        )
        msg = reply.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:                 # no more tools -> final answer
            return msg.content
        for call in msg.tool_calls:            # actually run the requested tool
            args = json.loads(call.function.arguments)
            result = run_tool(call.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

print(agent("Read what's in /etc/hostname"))
```

Every iteration does three things: **ask the model → run the tool it asked for → feed the result back**, until the model gives a final answer.

Every "framework" — LangChain, AutoGen, all of them — **is just these few dozen lines wrapped more conveniently**: logging, memory, concurrency, a UI. The kernel never changes.

Once that clicks, the other four ideas are easy.

## 1. Tool calling: the model decides, your code executes

Look at `cat` above. A model can talk, not act. What we did was:

- Tell it `cat`'s **name and parameters** (that `TOOLS` schema);
- Let it decide **whether to call it and with what path**;
- Let **`run_tool` actually execute it** and feed the result back.

The key line: **the model executes nothing**. It only emits "I'd like to `cat` `/etc/hostname`." **Your code always does the work** — that's your safety boundary, and the reason "give the model a clean pair of hands" beats "give it a hundred tools."

> Don't hoard tools. **Start with three you truly need** — that's enough to do a lot.

## 2. Memory: paste it short, retrieve it long

Models **have no memory** — every call is a stranger. In the code, the agent's "memory" is simply that ever-growing `messages` list — context we **choose to feed back**:

- **Short-term**: append the conversation. Simple, but it grows and costs more.
- **Long-term**: store key facts in a **vector store** and **retrieve** them when needed. Cheaper, and it scales.

**Start short-term**; add long-term when volume or cross-session recall demands it.

One line to keep: **memory isn't "storing" — it's "retrieving next time."**

## 3. Observability: debugging an agent means reading its trace

Models are **non-deterministic**: the same input can take completely different paths. So **if you can't see each step, you can't debug at all.**

You need, at minimum: each **model decision**, each **tool call** with its arguments and result (that `run_tool` line is the perfect place to log), and where **time and failures** go.

> **Debugging an agent is reading its execution trace.**

## 4. Local models: offline, private, edge-ready

In the code, `base_url` points at **Ollama** — local: **free, offline, private** — and it fits **edge devices** (small models run on a Jetson). Most frameworks speak Ollama's unified API.

One lesson: **small models are weak at tool calling.** So the order is — **get the loop working on a strong model first, then size down.**

## Next: get creative with `cat`

The nice part: this most ordinary tool is already enough for a **self-maintaining device agent**:

- Temperature: `cat /sys/class/thermal/thermal_zone0/temp`
- Memory: `cat /proc/meminfo`
- Load: `cat /proc/loadavg`

The moment the model learns to "**`cat` the temperature first, then decide whether to throttle**," you've taken the first step toward edge-device self-maintenance. **A tool doesn't have to be fancy — if it can read and see, the model can judge.**

---

**In one line**: an agent = **a loop plus tools**; memory makes it remember, observability makes it debuggable, a local model makes it deployable. **Frameworks change — the kernel doesn't.**
