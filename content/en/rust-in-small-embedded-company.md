---
title: "Should a small embedded company take Rust seriously? A veteran's take"
summary: "Disclaimer: I'm not a Rust expert — 15+ years of embedded C/C++, still learning Rust, yet increasingly convinced it's the trend. A veteran/learner's view: benefits, necessity, real difficulties, a playbook, and my take on whether safety should come from constraints or discipline."
---

**Disclaimer: I'm not a Rust expert.** I've spent 15+ years in embedded C/C++, I'm still learning Rust, and I've never actually gotten it adopted on a team. But **I'm increasingly convinced it's the trend.**

So this isn't a practitioner's write-up — it's **a veteran/learner's thoughts**. One thing I do know: **in a small company, whether Rust is technically right is one question; whether you can get it adopted is another.**

## Bottom line: don't "push", "plant"

**Fighting a "push Rust" campaign is a losing battle; planting a seed is not.**

- No "full rewrite / tech revolution" — that instantly creates enemies and hurts delivery;
- Land only on **new modules / new services / tools** (incremental, clean boundary, low risk);
- Aim at a **real team pain point**, and **let results speak** instead of arguing with principles.

## 1. Benefits: where Rust actually wins

For embedded, it wins at **runtime**, not fancy syntax:

| Dimension | Why |
| --- | --- |
| **Memory safety** | No GC, no interpreter; **compile-time** elimination of OOB / UAF / data races — the usual suspects behind firmware "2 AM crashes" |
| **Light runtime** | A carefully written service often sits at **a few MB** RSS, close to C (far below Python / Go runtimes) |
| **Concurrency safety** | `Send` / `Sync` turn "misused threads" into **doesn't compile** |
| **Simple deploy** | Static build, single binary; cross-compile to `*-musl` and drop it on the device |
| **Cheap maintenance** | The compiler has your back — you **dare to refactor**; less "fear of taking over" legacy code |

In one line: **it moves some runtime hazards to compile time.**

## 2. Necessity: why "now"

- Embedded code is **increasingly complex** (networking / OTA / multi-threading / protocol stacks); pure manual memory management **accumulates risk**;
- **Security & compliance** pressure is rising (audits, CVEs) — "it runs, ship it" is fading;
- **Upstream is moving**: the Linux kernel, Android, Windows all now involve Rust → the ecosystem is maturing;
- **People**: senior engineers retire, newcomers prefer modern languages — **a Rust bench is a hiring edge**.

## 3. The real difficulties (small-company specific)

No sugar-coating — these will stop you:

- **Nobody knows it**: during ramp-up **productivity drops first**, and a small company can least afford delivery slips;
- **Hard to hire** for;
- **Legacy & process**: existing C, build, CI, and debug chains (embedded gdb + Rust isn't smooth yet) all need rework;
- **Invisible payoff**: "the bug that didn't happen" is **invisible credit** — hardest to sell;
- **Low risk tolerance**: one bad experience and the team says "never again".

## 4. The playbook that works

1. **Incremental only**: new modules / tools; don't touch working legacy;
2. **In the seams**: write a Rust library and expose **only a C ABI** (`extern "C"`) for legacy code to call — clean boundary;
3. **Fix real pain first**: pick the module that **keeps crashing on memory/concurrency** or the "Python is painful to ship to devices" tool, rewrite a small piece, and **let data speak** (crashes, memory, perf, delivery speed);
4. **First shot small and bright**: choose an **independent, low-risk, self-contained** project (a protocol parser / CLI / thin device service) — a small but solid win;
5. **Lower the barrier**: scaffolding + CI template + cross-compile scripts + a `no_std` starter; one internal talk; pairing;
6. **Manage expectations**: **acknowledge** slow compiles and slow ramp-up; position Rust as "**better where it fits**", not a replacement for everything.

> Keywords: **incremental, real pain, small wins, results**. Not "Rust is better, let's switch" — nobody wants to hear that.

## 5. A bit of philosophy: safety should come from constraints, not discipline

My deeper reason for Rust:

- **In C, "correct" relies on human discipline** — code review, senior experience, luck. **In Rust, "correct" is the default** — you must *deliberately* write it wrong. **Handing discipline to the type system** is safety that scales.
- **The real cost was never "writing code"; it's "maintaining + incidents."** Rust moves cost from **2 AM phone calls at runtime** to **red errors at compile time** — **trading an affordable expense for an unaffordable liability.**
- **Adopting tech isn't a technical problem; it's a social one.** So use **increments + facts**, not debate — **people believe what they can see.**
- **An ideal needs a place to land**: not by convincing others, but by "**using it yourself to build things.**" Get Rust into your own projects first — you become the team's **living proof.**

## Closing

On pushing Rust in a small embedded company, my conclusion is one line:

> **Don't push — plant. Pick one small, real pain point, land one incremental step, let results speak.**

Rust is an ideal — but **an ideal shouldn't be dropped, nor shoved down throats** — **keep it, land it in your own hands.**

> 💬 Do you think this road is right? Are you bullish on Rust too? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696) to talk.

*（Bilingual post.）*
