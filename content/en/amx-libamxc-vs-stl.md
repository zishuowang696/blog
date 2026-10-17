---
title: "Is libamxc a C STL? Ambiorix Containers vs C++ STL"
summary: "Not exactly. libamxc borrows the STL's container ideas but uses C: void*, intrusive it, and macros for type recovery. No templates, no <algorithm>, no allocators. A comparison table of what it is and is not."
---

> Part 4 of *Understanding prplOS: Ambiorix and its libraries*. Examples: https://github.com/zishuowang696/amx-examples

## One line
> **It borrows the STL's container ideas but uses C: `void*` + intrusive `it` + macros.**
> It is an **industrial-grade C container library**, not a "C port of the STL".

## Similarities
- Matching containers: `llist` (list), `htable` (unordered_map), `array` (vector), `string`, `set`.
- A `Variant` (roughly `std::any` / `std::variant`).
- Same goal: stop reinventing wheels in every project.

## Differences
| C++ STL | libamxc (C) |
|---|---|
| **Templates**, compile-time type safety | **No templates** → `void*` + intrusive `it` + macros to recover the type |
| Non-intrusive containers | **Intrusive**: `amxc_llist_it_t it` must live inside your struct |
| `<algorithm>` (sort / find / transform…) | **No generic algorithms** |
| Unified iterators, allocators, ranges | Per-container iteration macros |
| Type errors at compile time | Type errors at run time |

Intrusive containers look like this:
```c
typedef struct { amxc_llist_it_t it; int value; } item_t;

amxc_llist_for_each(it, (&list)) {
    item_t* p = amxc_llist_it_get_data(it, item_t, it);
    printf("%d ", p->value);
}
```
The `it` is embedded in the struct; the macro converts it back to `item_t*`. That is the C-style "generics".

## What it is closer to
**GLib** (GList / GHashTable), **uthash**, **ccan**, BSD `sys/queue.h`.
It belongs to the category of "generic C container libraries", not "STL in C".

## The extra step: Variant
`amxc_var_t` is a tagged value that can hold int / string / bool / list / hash — so it can build a **JSON-like tree**. That is one step beyond a plain container library, and it is the foundation of the AMX data model.

## When to use it
- C projects, embedded, where you want **reuse and readability**.
- You no longer want to maintain your own `list.c` / `hash.c`.
- You can accept **intrusive** containers (which are often more efficient in C).

## One line
> **It is not the STL, but it is one of the closest things to STL-style containers in C.**
> Don't judge it by "is it the STL"; judge it by "can it replace the wheels in your project".

---

> Next: **libamxc's Variant: the "any type" in C.**
