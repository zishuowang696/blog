---
title: "Building an AI agent from scratch: it's just a loop"
summary: "Strip away the frameworks and an agent is just a loop: call the API to ask the model → run the tool → feed the result back. One complete runnable example, using DeepSeek."
---

New agent frameworks appear every month, which makes it easy to assume there's something deep inside. **There isn't.**

**The essence of an agent is a single loop:**

> **Call the API to ask the model → run the tool → feed the result back** — repeat until you get an answer.

Below is a **complete, runnable** minimal agent — powered by **DeepSeek**, with the most ordinary tool of all: `cat`. Once you see it, you'll realize every framework is just this loop wrapped more conveniently.

## The complete code

```python
import json, subprocess
from openai import OpenAI

# DeepSeek exposes an OpenAI-compatible API — use it directly
client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key="sk-your-deepseek-key",
)

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

# 3) The agent loop
def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        # (1) call the API to ask the model
        reply = client.chat.completions.create(
            model="deepseek-chat", messages=messages, tools=TOOLS
        )
        msg = reply.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:                 # no more tools -> final answer
            return msg.content
        # (2) run the tool   (3) feed the result back
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            result = run_tool(call.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

print(agent("Read what's in /etc/hostname"))
```

Every iteration of the loop does three things:

> **(1) call the API to ask the model → (2) run the tool → (3) feed the result back** — then back to (1), until the model gives a final answer.

Every "framework" — LangChain, AutoGen, all of them — **is just these few dozen lines wrapped more conveniently**: logging, memory, concurrency, a UI. The loop never changes.

Once that clicks, the rest is easy.

## 1. Tool calling: the model decides, your code executes

Look at `cat` above. A model can talk, not act. What we did was:

- Tell it `cat`'s **name and parameters** (that `TOOLS` schema);
- Let it decide **whether to call it and with what path**;
- Let **`run_tool` actually execute it** and feed the result back.

The key line: **the model executes nothing**. It only emits "I'd like to `cat` `/etc/hostname`." **Your code always does the work** — that's your safety boundary, and the reason "give the model a clean pair of hands" beats "give it a hundred tools."

> Don't hoard tools. **Start with three you truly need** — that's enough to do a lot.

## 2. Memory: paste it short, retrieve it long

Models **have no memory** — every call is a stranger. In the code, the agent's "memory" is simply that ever-growing `messages` list — context we carry along when we **feed results back**:

- **Short-term**: append the conversation. Simple, but it grows and costs more.
- **Long-term**: store key facts in a **vector store** and **retrieve** them when needed. Cheaper, and it scales.

**Start short-term**; add long-term when volume or cross-session recall demands it.

One line to keep: **memory isn't "storing" — it's "retrieving next time."**

## 3. Observability: debugging an agent means reading its trace

Models are **non-deterministic**: the same input can take completely different paths. So **if you can't see each step, you can't debug at all.**

You need, at minimum: each **model decision**, each **tool call** with its arguments and result (that `run_tool` line is the perfect place to log), and where **time and failures** go.

> **Debugging an agent is reading its execution trace.**

## 4. Switching models is one line

The code above uses **DeepSeek** (an OpenAI-compatible API). Want a different model — GPT, Claude, any inference service? **Just change `base_url`, `api_key`, and `model`** — the `agent()` loop doesn't change at all.

> That's the value of a standardized interface: the model is a replaceable part; your loop is the asset.

## Next: get creative with `cat`

The nice part: this most ordinary tool is already enough for a **self-maintaining device agent**:

- Temperature: `cat /sys/class/thermal/thermal_zone0/temp`
- Memory: `cat /proc/meminfo`
- Load: `cat /proc/loadavg`

The moment the model learns to "**`cat` the temperature first, then decide whether to throttle**," you've taken the first step toward edge-device self-maintenance. **A tool doesn't have to be fancy — if it can read and see, the model can judge.**

---

**In one line**: **the essence of an agent is a single loop — call the API to ask the model → run the tool → feed the result back.** Frameworks change; the loop doesn't.
