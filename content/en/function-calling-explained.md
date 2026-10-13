---
title: "Function Calling Explained: one diagram is enough"
summary: "The model doesn't call your functions — it only outputs a structured 'call this tool with these args', and your code runs it. One diagram + 30 lines to make function calling click."
---

A lot of people think Function Calling means "the model calls your function". **It doesn't.**

> **The model never executes anything. It only outputs structured text: "I'd like to call `get_weather` with `{"city":"Beijing"}`". Your code is what actually runs it.**

The essence of Function Calling, in one line:

> **It turns "make the model emit a JSON tool request" into a standard capability — then your program executes it and feeds the result back.**

It doesn't change the old friend from the previous post — the loop:

```
user asks
   ↓
[model] decides: answer directly, or call a tool?
   ↓ call
your code runs the tool (query DB, hit an API, read a sensor…)
   ↓
feed the result back to the model
   ↓
[model] gives the final answer
```

## Three steps, that's all

**① You give the model a "tool list"** — a manual written in JSON Schema:

```python
tools = [{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get the current weather of a city",
    "parameters": {
      "type": "object",
      "properties": {"city": {"type": "string", "description": "city name"}},
      "required": ["city"],
    },
  },
}]
```

**② The model decides which tool to call, with which arguments** — it outputs not natural language, but a structured `tool_calls`:

```json
{"name": "get_weather", "arguments": {"city": "Beijing"}}
```

**③ Your code executes it, feeds the result back**, and the model turns it into a human answer.

## 30 lines that run

(OpenAI-compatible API; DeepSeek works too)

```python
import json, os
from openai import OpenAI

client = OpenAI(base_url="https://api.deepseek.com", api_key=os.environ["DEEPSEEK_API_KEY"])

def get_weather(city):           # your real function
    return {"Beijing": "sunny 22C", "Shanghai": "light rain 19C"}.get(city, "unknown")

TOOLS = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get the current weather of a city",
        "parameters": {"type": "object",
                       "properties": {"city": {"type": "string"}},
                       "required": ["city"]},
    },
}]

def run(name, args):
    if name == "get_weather":
        return json.dumps(get_weather(args["city"]))
    return "unknown tool"

def agent(q):
    messages = [{"role": "user", "content": q}]
    while True:
        msg = client.chat.completions.create(
            model="deepseek-chat", messages=messages, tools=TOOLS
        ).choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            return msg.content                       # no tool call -> done
        for call in msg.tool_calls:                  # run the tool -> feed it back
            args = json.loads(call.function.arguments)
            messages.append({"role": "tool",
                             "tool_call_id": call.id,
                             "content": run(call.function.name, args)})

print(agent("What's the weather in Beijing?"))
```

See — **still the same loop**: ask the model → run the tool → feed the result back.

## Three common myths

1. **"The model ran the function"** — no. It only *describes* what to call; **execution is always your code**;
2. **"You must use the official SDK"** — no. Function calling is just **an agreed JSON format**; you can do it over raw HTTP;
3. **"More tools is better"** — the opposite. More tools means the model picks wrong more often. **Few, precise, well-described** tools win.

## How does this relate to MCP?

In one line: **MCP = standardized function calling.**

- Function calling answers "how does the model ask for a tool";
- MCP answers "how do tools become **reusable across apps**" (turn a tool into a standalone process).

Understand this post first, then [MCP in 30 lines](/en/posts/mcp-in-30-lines) clicks immediately.

## Why this matters for embedded

Because a "tool" isn't only weather — it can be **read temperature, toggle GPIO, restart a service, flash firmware**:

> **Give the model a tool list, and it can operate your device.**

That's the starting point of an **edge agent**: the model decides, the tools touch hardware. Next post: deploying an agent onto a Jetson.
