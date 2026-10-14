---
title: "Demo: let an AI agent (REA) decompile a Hello World"
summary: "How do you actually use REA? Practice on the smallest target: a stripped Hello World. Three steps — prepare the target, wire up REA, ask in plain language — and watch a binary turn into pseudocode plus evidence."
---

Last post we covered [REA (Reverse Engineer Anything with agents)](/en/posts/rea-reverse-engineer-anything-review). This one **shows how to use it** — on the smallest possible target: a **Hello World**.

Three steps: **prepare the target → wire up REA → ask one question.**

## Step 1: prepare a "target" (a stripped binary)

```c
#include <stdio.h>
int main(void) { printf("Hello, REA!\n"); return 0; }
```

```bash
gcc -O0 -s hello.c -o hello     # -s: strip symbols, to simulate "no source"
```

Now `hello` is an **ELF64, stripped, no function names** binary — the classic starting point for reversing.

## Step 2: wire REA into your agent

```bash
npx rea-agents setup
```

Pick **your agent** (Claude Code / Codex / Cursor…). It will:
- register **REA's MCP server** with the agent;
- install matching **workflow instructions**;
- back up your existing config.

**One prerequisite**: a **native binary** (like this ELF) needs an **analysis engine** — **Ghidra (free)**, Hopper, or IDA. JS / .NET static analysis needs no engine. Install an engine, restart the agent, done.

> **Need Ghidra fast?** Use its own downloader (multi-mirror parallel, **GitHub: <https://github.com/zishuowang696/gh-download>**):
>
> ```bash
> scripts/gh-download.sh NationalSecurityAgency/ghidra Ghidra_12.1.4_build --pattern '*PUBLIC*.zip' -d ./ghidra
> ```
>
> — 543 MB, measured **4.7 MiB/s** (see [the China-friendly GitHub downloader](/en/posts/gh-downloader)).

## Step 3: ask in plain language

Inside the agent, just say it in English:

> **"Decompile `./hello`, explain what `main` does, and recover the string."**

(The CLI path — `npx rea-agents@latest` analyze — works the same way.)

## What you get back (our real result)

I actually ran it on **Linux + Ghidra 12.1.4 + Node 24 + REA 6.4.0**.

**With symbols**: `rea decompile ./hello_sym main` →

```c
undefined8 main(void)
{
  puts("Hello, REA!");
  return 0;
}
```

And it returns not just code, but **with evidence**:

- `provider: ghidra 12.1.4`, `confidence: observed`;
- a list of `limitations` (explicitly: "**this is decompiler output, not source, and not text-equivalent to Hopper output**").

**A fun catch**: we wrote `printf("Hello, REA!\n")`, but the compiler **optimized it into `puts`** — REA lays that bare.

**On the stripped `hello`**: `rea decompile ./hello main` →

```
error: Analysis failed
message: "Unknown Ghidra procedure name or address: main"
```

**That's the reality of "no symbols"**: names are gone, so you (or the AI) must locate it **by address** — it's **not a "one-click to source" magic trick.**

**That's REA's positioning**: it doesn't say "trust me" — it gives you **conclusion + evidence + limitations**, far better than an AI guessing.

## The catch: it's fast, but you must be able to verify

> **REA saves you the time of reading assembly — not the responsibility of understanding it.**

It hands you pseudocode, and **you need to verify it** (a quick `objdump -d`, a `strings` cross-check). That's why it's worth knowing a little low-level anyway — not to do it by hand, but to **check the AI's conclusions.**

## Recap

- **REA = an "AI reverse-engineering assistant"**: tools live in a server, and it connects engines to your agent;
- usage is minimal: **prepare target → install REA → ask one question → read pseudocode + evidence**;
- **don't treat it as magic**: it's a **speed-up**, and **judgment + verification are still on you.**
