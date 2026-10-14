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

> **Need Ghidra fast?** Use its own downloader (multi-mirror parallel):
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

## What you get back

REA returns results **together with evidence**. A typical reply:

- **pseudocode** (roughly `int main() { puts("Hello, REA!"); return 0; }`);
- the **matching assembly / strings / call graph** — as **evidence**;
- plus its **limitations** (what's inferred vs. what's uncertain).

**That's REA's positioning**: it doesn't say "trust me" — it gives you **conclusion + evidence + limitations**, which is far better than an AI guessing.

And you can keep asking:

> "Which address holds that string? Why `puts` instead of `printf`?"

(The second one is: the compiler **optimized `printf("...\n")` into `puts`** — the AI can point that out.)

## The catch: it's fast, but you must be able to verify

> **REA saves you the time of reading assembly — not the responsibility of understanding it.**

It hands you pseudocode, and **you need to verify it** (a quick `objdump -d`, a `strings` cross-check). That's why it's worth knowing a little low-level anyway — not to do it by hand, but to **check the AI's conclusions.**

## Recap

- **REA = an "AI reverse-engineering assistant"**: tools live in a server, and it connects engines to your agent;
- usage is minimal: **prepare target → install REA → ask one question → read pseudocode + evidence**;
- **don't treat it as magic**: it's a **speed-up**, and **judgment + verification are still on you.**
