---
title: "I gave my blog an agent: auto topic ideas every week"
summary: "The annoying part of running a blog isn't writing — it's choosing topics. So I wrote a minimal agent that runs on GitHub Actions, reads my existing posts weekly, and proposes 5 new topics. It's still just the loop: ask the model → run the tool → feed the result back. Reusable template included."
---

The annoying part of running a blog isn't writing — it's **picking topics**. What do I write today? It's guesswork, and it eats time.

So I gave it an **agent**: every Monday it reads my **published posts** (to avoid repeats) and proposes **5 new topics**. It runs on **GitHub Actions** — **free, scheduled, no server**.

And the essence never changes: **an agent is a loop — call the API to ask the model → run the tool → feed the result back.**

## What it actually does

One loop, one tool:

```python
TOOLS = [{
    "type": "function",
    "function": {
        "name": "list_existing_titles",
        "description": "read existing post titles to avoid duplicates",
        "parameters": {"type": "object", "properties": {}},
    },
}]

def run_tool(name, args):
    if name == "list_existing_titles":
        xml = urlopen(FEED).read().decode("utf-8", "ignore")   # read the site RSS
        titles = re.findall(r"<title>(.*?)</title>", xml, re.S)
        return "\n".join(titles[1:])
```

Model is DeepSeek (OpenAI-compatible). The loop:

```python
def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        msg = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            return msg.content                     # no more tools -> answer
        for call in msg.tool_calls:                # run the tool -> feed it back
            args = json.loads(call.function.arguments or "{}")
            messages.append({"role": "tool", "tool_call_id": call.id,
                             "content": run_tool(call.function.name, args)})
```

Output goes to `weekly/<date>.md`. That's it — **no framework, just a loop.**

## Why GitHub Actions

To me this is the neat part:

- **Free**: public repo, unlimited minutes;
- **Scheduled**: `on: schedule: cron`, runs weekly;
- **No server**: nothing to host;
- **Internet access**: runners are in the **US**, reaching DeepSeek / Google APIs directly;
- **Repo access**: it can **commit the result back**.

```yaml
on:
  schedule: [{ cron: '0 1 * * 1' }]
  workflow_dispatch: {}
permissions: { contents: write }
# ... pip install -> python agent/topics.py -> git commit weekly/
```

Secrets go in **Secrets** (`DEEPSEEK_API_KEY`); site config in **Variables** (`SITE_FEED`/`SITE_BRIEF`) — **never in code**.

## It actually delivered

On its first run it read 17 published posts and replied (excerpt):

> The existing content is mostly low-level build / framework internals, but **"running an agent on an edge device" is almost a blank spot.** The 5 topics below all land in that gap…

Then it gave 5 topics plus a **scheduling plan** (lead-gen → conversion → moat). Honestly, **better than my gut**.

## My principle: the agent does the dirty work, the human judges

That's also why I kept it small and **open-sourced only the framework**:

- **Agent does the dirty / half-done work**: topics, drafts, retros, distribution copy;
- **Human judges and publishes**: which one, how to write, whether to ship;
- **Open architecture, private data**: the framework is open; but **data, keys, keyword lists, business strategy** stay private.

For instance, my **real prompt, keyword list, and GSC data** live in a private repo — what's public is only *how it's built*.

## Next

- Add a tool to **read a GSC export** (topics with impressions but no clicks first);
- Add a "**draft agent**" (first-pass drafts);
- But **publishing always stays with the human**.

> 📦 Reusable template (private bits removed): **[github.com/zishuowang696/weekly-topics-agent](https://github.com/zishuowang696/weekly-topics-agent)**
>
> 💬 What would you have it do? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696/weekly-topics-agent/issues) on GitHub.
