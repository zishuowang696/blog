---
title: "Why I Searched for a C Container for Years — Until Ambiorix (prplOS)"
summary: "C has no standard containers. I looked for one for years, wrote my own, and it never felt right. Then I found Ambiorix (AMX) in prplOS — and realized I wasn't looking for a list/hash library, but for a container-based system skeleton. Pure C, no C++ runtime, ~187 KB stripped."
---

## The question I judge a framework by

> **Without reading the code — just by looking at the configuration — can you tell what the program does?**

Most C projects can't. "What the program does" is scattered across headers, hand-written init code, duplicated device state, and list/hash implementations only the author understands.

Readability ultimately comes down to **configuration**:

- configuration explains the **structure**;
- structure explains the **intent**;
- once intent is clear, maintenance doesn't depend on "asking the author".

That's what struck me about **Ambiorix (AMX)**.

## C has no standard containers

C++ has the STL, Java has collections, Go has maps/slices. C has lists, hash tables, dynamic arrays and strings — **rewritten in every project**.

Writing them isn't hard; the hard part is:

- every project does it differently;
- memory, alignment, ownership, iterator invalidation — all the same traps;
- code isn't reusable across projects;
- when it breaks, only its author can fix it.

## So I went looking

I looked for years, and wrote my own. It worked — but it was never satisfactory.

Then I understood why:

> **A container library is just a part. The hard part is how the parts become a machine — how components find each other, describe their state, get assembled, and get called remotely.**

No list/hash library solves that.

## My bet

> **If a system like OpenWrt adopted a container-based framework, it would save roughly 80% of the duplicated work.**

(My estimate, not a measurement.)

What you actually want isn't `void*` stuffed into a linked list. You want:

- a **uniform description** of components (objects, parameters, interfaces);
- **assembly** from configuration, not hardcoded wiring;
- communication over a **bus** instead of `#include`-ing each other;
- **business code unchanged** when the platform/bus changes.

## Then I saw Ambiorix in prplOS

`libamxc`: containers (list / hash / string / variant).
`libamxd`: data model (objects / parameters / functions).
`libamxb`: bus abstraction (ubus / D-Bus).
`libamxo`: ODL-based assembly.
`libamxrt`: component runtime and lifecycle.

**It turns "containers" into a "system skeleton".** That's the layer I had been looking for.

> **AMX is not only for prpl: its containers (list / hash / string / variant) work in any C project.**
>
> **Pure C (C11), no C++ runtime; `libamxc.so` is ~187 KB stripped and depends only on libc.**

## What it saves

- **Less work**: no rewriting containers; components don't `#include` each other; the data model is declared in ODL; swapping the bus doesn't change business code.
- **More readable**: one data model, config separated from code, clear component boundaries, predictable paths.

> **Saving work is "write less"; readability is "maintain better". One saves development time, the other saves everyone's time later.**

## For anyone who has searched as long as I have

If you've written your own `list.c` / `hash.c`, fought with component coupling, and built your own wheels —

**Ambiorix is worth a serious look.** Not because it's perfect, but because it answers an old question: **C can have a container-based system skeleton — and it already runs.**

---

> This is the series: *Understanding prplOS: Ambiorix and its libraries*.
> Next: **Ambiorix Explained (1): the C "Spring" — components, bus, data model.**
