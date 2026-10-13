---
title: "Tool results too big? Don't feed them all back"
summary: "The most hidden performance killer in agents: a tool returns a pile of logs/files and you paste it straight back into context — tokens explode, it gets slow, and the model drowns. The real fix is on the tool side: make it a query port, not a printer."
---

Last post was about [messages growing forever](/en/posts/agent-context-management). The **biggest source of that growth is usually one thing**:

> **A tool returns a huge result, and you feed it back into context raw.**

A `cat` of a 200KB log, an `ls -R` with thousands of lines, a full HTML page from a fetch… all land in messages. The result:

- **Tokens explode** → cost and latency rise together;
- **The model drowns** → the 3 useful lines are buried in 50,000, so it misses them;
- A bit bigger → **it blows past the context window**.

## The core idea

> **A tool is a query port, not a printer.**

Every byte that enters messages **costs tokens** and steals the model's attention. So the right move isn't "dump the output back" — it's "**bring back only what's needed, in the smallest form**".

```
tool runs
   ↓
【filter / truncate / summarize】   ← the key step most people skip
   ↓
feed back to the model (small, precise)
```

## Four concrete fixes

### 1. Safety net: truncate head + tail
The simplest — if too long, **keep head and tail, drop the middle**.

```python
MAX = 4000  # per-tool-result cap (chars)

def cap(text: str, limit: int = MAX) -> str:
    if len(text) <= limit:
        return text
    half = limit // 2
    return f"{text[:half]}\n…({len(text) - limit} chars omitted)…\n{text[-half:]}"
```

### 2. Don't `cat` — read in pages
Give the model a tool that **reads on demand**, instead of shoving the whole file at it.

```python
def read_file(path: str, offset: int = 0, limit: int = 100) -> str:
    lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()
    chunk = lines[offset : offset + limit]
    more = len(lines) - (offset + limit)
    out = "\n".join(chunk)
    if more > 0:
        out += f"\n…({more} more lines; continue with offset={offset + limit})"
    return out
```

### 3. Give a "search" tool, not a "dump everything" tool
When searching logs, **filter inside the tool** and return only matching lines.

```python
def search_log(path: str, pattern: str, max_hits: int = 30) -> str:
    hits = [f"{i+1}: {ln}" for i, ln in enumerate(
        open(path, encoding="utf-8", errors="ignore")) if pattern in ln]
    body = "\n".join(hits[:max_hits])
    return body + (f"\n…{len(hits)} matches total" if len(hits) > max_hits else "")
```

### 4. Structural results: return the *point*
When running a command, don't return all of stdout — return **exit code + a few key lines + counts**:

```python
def run_and_summarize(cmd: str) -> str:
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    out = p.stdout
    return (f"exit={p.returncode}\n"
            f"stdout({len(out)} chars, last 30 lines):\n"
            + "\n".join(out.splitlines()[-30:])
            + (f"\nstderr:\n{p.stderr[-1000:]}" if p.stderr else ""))
```

## One-line rules

| You want to | Wrong | Right |
| --- | --- | --- |
| Read logs | `cat app.log` | `search_log(path, keyword)` |
| Read a file | feed the whole file | `read_file(offset, limit)` |
| Run a command | full stdout | exit code + tail + counts |
| Fetch a page | whole HTML | extract text / summarize first |

## Why this matters even more on the edge

Edge / small models often have just **8K** of context. **One unfiltered `cat` can eat the entire window.**

> In the cloud, "result too big" means **slow and expensive**; on the edge, it means **it won't run at all**.

## The takeaway

Remember this:

> **A tool's value isn't how much it can fetch — it's how little it can return.**

When you design a tool, ask: **does the model really need all of this?** Most of the time — no.
