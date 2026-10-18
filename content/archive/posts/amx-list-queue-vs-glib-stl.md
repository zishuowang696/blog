---
title: "Ambiorix 原理（5）：链表与队列——为什么它比 GLib/STL 更轻？"
date: 2026-10-18
tags: [prpl, prplos, ambiorix, libamxc, c, 容器]
series: "深入理解 PRPL 之 Ambiorix 相关库"
summary: "libamxc 的链表是侵入式的：it 嵌在你的结构体里，入队/出队零分配；队列/栈只是「换一端取」。为什么不用 GLib/STL？因为它更轻，而且容器 + Variant 是为「序列化」设计的。这篇用可运行例子和对比表讲清。"
published: true
---

> 系列第 5 篇。示例代码：[github.com/zishuowang696/amx-examples](https://github.com/zishuowang696/amx-examples)。

## 先看代码：链表
`libamxc` 的链表是**侵入式**的——`amxc_llist_it_t` 嵌在你的结构体里：

```c
typedef struct { amxc_llist_it_t it; int v; } item_t;

amxc_llist_t list;
amxc_llist_init(&list);
item_t a = { .v = 1 }, b = { .v = 2 };
amxc_llist_append(&list, &a.it);
amxc_llist_append(&list, &b.it);

amxc_llist_for_each(it, (&list)) {
    item_t* p = amxc_llist_it_get_data(it, item_t, it);
    printf("%d ", p->v);
}
amxc_llist_clean(&list, NULL);
```

**特色**：
- **零节点分配**：入链不 `malloc`，`it` 就在你自己的结构体里；
- **O(1)** 插入/删除（已有 `it` 时）；
- **缓存友好**（元素可以集中分配）；
- 用宏 `*_it_get_data` 把 `it` 换回 `item_t*`——这是 C 版的"泛型"。

## 队列和栈：只是"换一端取"
队列 = 链表 + `take_first`；栈 = 链表 + `take_last`。**没有第二套实现，也没有额外分配。**

```c
/* 队列：FIFO */
amxc_lqueue_add(&q, &a.it);
amxc_lqueue_add(&q, &b.it);
amxc_lqueue_add(&q, &c.it);
/* remove → take_first */

/* 栈：LIFO */
amxc_lstack_push(&s, &d.it);
amxc_lstack_push(&s, &e.it);
amxc_lstack_push(&s, &f.it);
/* pop → take_last */
```
实测输出：
```
queue: 1 2 3
stack: 3 2 1
```

数组版同理：`amxc_aqueue_add(queue, data)` / `amxc_astack_push(stack, data)` 存 `void*`，适合"元素不适合内嵌 `it`"的场景。

## 和 GLib / STL 比
| | libamxc | GLib（GList/GQueue） | C++ STL（list/deque） |
|---|---|---|---|
| 节点分配 | **零**（侵入式） | 每个元素 **malloc 一个节点** | `list` 每节点分配；`deque` 分块 |
| 类型 | `void*` + 宏 | `gpointer` | **模板**，编译期类型安全 |
| 依赖 | **只有 libc** | 依赖 GLib | 依赖 C++ 运行时/STL |
| 入队确定性 | **无 malloc，确定性** | 可能分配失败 | 可能分配/异常 |
| 序列化 | **容器 + Variant 可序列化** | 无 | 无（需自己写） |

**为什么更轻**：侵入式 + 零分配 + 纯 C，`libamxc.so` strip 后约 **187K**，只依赖 libc。

## 那为什么"重写一套"？——不只是为了轻
你可能会问：有 GLib、有 STL，为什么还要自己写？我读到现在的理解是三层：

1. **C 项目**：STL 用不了；
2. **GLib 太重**：AMX 想要"小依赖、可移植到各种嵌入式平台"；
3. **最关键：为序列化/数据模型服务**。
   `amxc_var_t`（Variant）能装 int/string/bool/**list/hash**，容器和 Variant 组合起来就是一棵**可 dump、可序列化**的数据树——这正是 **ODL 装配、RPC、数据模型** 需要的底座。
   **GLib/STL 的容器不会自动变成"数据模型"。**

所以它不是"重复造轮子"，是**为"可序列化的组件系统"造了一套底座**。

## 一句话
> **侵入式 + 零分配 = 轻；容器 + Variant = 能序列化。**
> 轻是表象，**"为数据模型服务"才是它重写一套的真正原因。**

---

> 下一篇：**《libamxc 的 Variant：C 里的"万能类型"》**——一个变量怎么装下所有东西。
