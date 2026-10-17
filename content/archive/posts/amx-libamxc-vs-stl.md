---
title: "AMX 原理（4）：libamxc 是不是 C 的 STL？"
date: 2026-10-18
tags: [prpl, amx, c, 容器]
series: "深入理解 PRPL 之 AMX 相关库"
summary: "不是。它借了 STL 的「容器」思想，但用的是 C 的做法：void* + 侵入式 it + 宏取类型。没有模板、没有 <algorithm>、没有 allocator。这篇用一张对比表说清楚它像什么、不像什么。"
published: true
---

> 系列第 4 篇。示例代码：[github.com/zishuowang696/amx-examples](https://github.com/zishuowang696/amx-examples)。

## 一句话
> **它借了 STL 的"容器"思想，但用的是 C 的做法：`void*` + 侵入式 `it` + 宏。**
> 它是 **"C 的工业级容器库"**，不是"STL 的 C 版"。

## 像 STL 的地方
- 有对应的容器：`llist`（list）、`htable`（unordered_map）、`array`（vector）、`string`、`set`；
- 有 `Variant`（≈ `std::any` / `std::variant`）；
- 目标一样：**别每个项目重造轮子**。

## 不像的地方（关键）
| STL | libamxc（C） |
|---|---|
| **模板**，编译期类型安全 | **没有模板** → `void*` + 侵入式 `it` + 宏取回类型 |
| 非侵入式容器（元素放进去即可） | **侵入式**：`amxc_llist_it_t it` 必须嵌进你的结构体 |
| 有 `<algorithm>`（sort / find / transform…） | **没有那套泛型算法** |
| 统一迭代器抽象、allocator、ranges | 只有各容器自己的遍历宏 |
| 类型错误编译期报 | 类型靠约定/宏，错在运行时才炸 |

**侵入式长这样**（来自 [示例仓库](https://github.com/zishuowang696/amx-examples)）：
```c
typedef struct { amxc_llist_it_t it; int value; } item_t;

amxc_llist_for_each(it, (&list)) {
    item_t* p = amxc_llist_it_get_data(it, item_t, it);
    printf("%d ", p->value);
}
```
`it` 嵌在结构体里，遍历时用宏把它"换算"回 `item_t*`——这就是 C 版的"泛型"。

## 它更像谁
- **GLib**（GList / GHashTable）、**uthash**、**ccan**、BSD 的 `sys/queue.h`。
- 也就是说：**"C 的通用容器库"这个品类**，不是"STL 的 C 移植"。

## Variant 多走的一步
`amxc_var_t` 是"带类型标签的值"，能装 int / string / bool / 列表 / 哈希——所以它能拼出 **JSON 式树**。
这是它比普通容器库多走的一步，也是 AMX 数据模型的底座。

## 什么时候用它
- C 项目、嵌入式、要**可复用 + 可读**；
- 不想再维护自己的 `list.c` / `hash.c`；
- 能接受**侵入式**容器（其实这在 C 里更高效）。

## 一句话
> **它不是 STL，但它是"C 里最接近 STL 那套容器思路"的东西之一。**
> 别拿"是不是 STL"评判它，拿"能不能替掉你项目里那些轮子"评判它。

---

> 下一篇：**《libamxc 的 Variant：C 里的"万能类型"》**——一个变量怎么装下所有东西。
