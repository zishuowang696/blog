---
title: "Memory is profit: choosing a language in embedded is really a cost decision"
summary: "After years of building routers, my deepest lesson: RAM is BOM, BOM is profit. So 'Python vs C/Rust' was never a technical preference — it's a cost calculation: dev labor vs per-unit material."
---

After many years building routers, one of my deepest lessons:

> **In hardware products, RAM is BOM, and BOM is profit.**

So "Python or C / Rust" was never a **technical preference** — it's a **cost calculation**. Yet most discussions stop at "which language is better" and never do the math.

## The math: the delta of 128 / 256 / 512 × shipment volume

Using common tiers (numbers are **illustrative**, don't nitpick the exact price):

| Memory tier | DRAM delta per unit (illustrative) |
| --- | --- |
| 128 → 256MB | about **$0.3 – $1** |
| 256 → 512MB | about **$0.5 – $1.5** |

Tiny per unit — until you **multiply by volume**:

> **100,000 units × $0.5 = $50,000**

Meanwhile, "the dev labor Python saves" is a few tens of thousands at most. **At volume, the material saved outweighs the labor saved.** That's how hardware companies do the math.

## Memory isn't just money

For 24/7 devices, memory is also:

- **Power / thermals / size** (smaller memory → less power → smaller PSU/cooling);
- **Reliability** (tighter memory → more OOM / jitter — a hazard on shipped devices).

**Less memory = less power, less heat, fewer failures.**

## So "Python's dev efficiency" has to be counted this way

Python saves **labor / time**; it costs **per-unit material**:

| | Python | C / Go / Rust |
| --- | --- | --- |
| Dev labor | ✅ less | ❌ more |
| Per-unit memory | ❌ costly (interpreter ~tens of MB) | ✅ lean |
| Winner at volume | — | ✅ **material > labor** |

**The axis** is not "which language is better", but:

> **"volume × per-unit memory delta" vs "dev labor".**

## What that axis implies

| Scenario | Winner | Why |
| --- | --- | --- |
| **High-volume shipped hardware** (routers/consumer) | **C / Go / Rust** | material > labor |
| **Low-volume / high-complexity / internal tools / cloud** | **Python** | labor > material |
| **Prototypes / glue / tooling** | **Python** | fast, and not in the shipped BOM |

So in reality it's always **layered**: **tight-memory devices in C/Go/Rust, Python upstream for orchestration / tooling / non-shipped devices** — Python isn't obsolete, it was just **standing in the wrong place**.

## What about Rust? An ideal — not yet in hand

Rust's pitch is exactly "**both at once**": as **safe and easy** as a modern language, with a runtime **close to C** — in theory it eats both "dev efficiency" and "low memory".

But be honest: **Rust's dev efficiency hasn't caught up with Python yet** (especially prototypes / glue), and there's a learning curve. So "**Rust = both**" is the **direction**, not the present. For tight-memory devices, C/Rust are the real answer; where tens of MB are affordable, Python still wins.

## Closing

Engineers **should not only write code, but do the math**:

> One device with 128MB more memory = how many DRAM chips = how many dollars → × volume = your profit.

**Memory is money. Choosing a language is how you spend it.**

> 💬 How does memory factor into cost in your product? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696) to talk.

*（Bilingual post.）*
