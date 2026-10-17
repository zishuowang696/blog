---
title: "Ambiorix (prplOS) Explained (1): The C 'Spring' — Components, Bus, and Data Model"
summary: "Ambiorix (AMX) is the core framework of prplOS: a component container, a bus abstraction, and a data model, implemented in C. If you come from Java, think of it as a C version of the Spring container — but this post is precise about what it is and what it is not."
---

> Based on reading the open-source Ambiorix project. APIs are defined by the actual source.

## One line
**Ambiorix (AMX) is the core framework of prplOS: a component container + bus abstraction + data model, in C.**

If you come from Java, the closest analogy is a **C version of the Spring container**: it manages components, lifecycles and dependencies. But it is more than DI — it also owns the **bus** and the **object tree**.

## Why it exists
Embedded systems have many buses:

- **ubus** (OpenWrt)
- **D-Bus** (RDK-B / desktop)
- plus proprietary buses

The result: **the same business component must be rewritten for every platform.**

AMX's goal:

> **Provide a common C API over all these buses, so components can be reused across platforms.**

It is not another bus — it is an **abstraction layer** over buses.

## Layers
```
        Clients / apps (amx-cli, ba-cli, web)
                        │
                  ┌─────▼─────┐
                  │  libamxb  │  bus abstraction (ubus / D-Bus / private)
                  └─────┬─────┘
                        │
        ┌───────────────▼───────────────┐
        │  libamxd  data model (tree)   │◄── libamxo  ODL assembly/parsing
        │  Object / Parameter / Function│
        └───────────────┬───────────────┘
                        │
                  ┌─────▼─────┐
                  │  libamxc  │  containers (list / hash / variant)
                  └───────────┘

        libamxrt = runtime container: init → start → stop
```

## The four pieces
1. **`libamxc` — containers**: linked lists, hash tables, dynamic arrays, variants. *The building blocks.*
2. **`libamxd` — data model**: objects/parameters/functions form an addressable tree. *The "beans and properties."*
3. **`libamxb` — bus abstraction**: hides ubus/D-Bus behind one API. *Dependency lookup and calls.*
4. **`libamxo` — assembly (ODL)**: Object Definition Language describes and loads the tree. *Configuration/assembly.*
5. **`libamxrt` — runtime**: component loading and lifecycle (init/start/stop).

## Compared with Spring
| Spring | AMX | Role |
|---|---|---|
| Bean container / IoC | `libamxrt` + `libamxd` | component and object lifecycle |
| Bean / properties | Object / Parameter (`libamxd`) | data model |
| `@Autowired` / lookup | `libamxb` | decoupling, bus lookup |
| XML / annotations | `libamxo` **ODL** | describe and load the object tree |
| Collections | `libamxc` | containers in C |

**But be clear about the difference**: Spring is a **dependency-injection framework**; AMX is a **bus abstraction + data model + component framework**. "Container" is a useful hook, not a precise equivalence.

## A minimal chain
```
ODL describes the object tree
  → libamxo parses and loads it into libamxd
  → components register on libamxb
  → clients query/call objects over the bus
```
When you query a node with `ba-cli`, you are using the last mile of this chain.

## Boundaries
- AMX manages **components and interfaces**, not business logic.
- Its value: **swap the bus without touching business code.**
- It is not magic: the quality of the data model still depends on the person designing the components.

---

> Next: **Ambiorix Explained (2): the data model — objects, parameters, paths.**
