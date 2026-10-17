---
title: "AMX 原理（3）：libamxc 实战——6 个例子讲清 C 的容器"
date: 2026-10-18
tags: [prpl, amx, c, 容器]
series: "AMX 原理"
summary: "libamxc 是 AMX 的基础容器库：链表、哈希、动态字符串、Variant、数组、集合。纯 C、不用 C++ 运行库、strip 后约 187K、只依赖 libc——可以直接用在任意 C 项目里。这篇用 6 个可编译的例子讲清用法与边界。"
published: true
---

> 系列第 3 篇。前两篇：[C 版 Spring 容器](/posts/amx-principles-1-container-bus-datamodel) · [数据模型](/posts/amx-principles-2-datamodel)。
> 本文所有例子都在 PC 上**实际编译并运行过**。

## 为什么值得看
C 没有标准容器：链表、哈希、动态字符串、变长数组——每个项目自己写一遍。
`libamxc` 把这些做成了**工业级、可复用**的库：

- **纯 C**（C11），不需要 C++ 运行库（`ldd` 只有 `libc`）；
- `libamxc.so` **strip 后约 187K**，占用小；
- 许可证 **BSD-2-Clause-Patent**（商用友好）；
- **不依赖 prpl/硬件**，可以**直接用在任意 C 项目**里。

编译（用仓库自带的 `include` + 编出的 `.so`）：
```bash
cc -I /path/to/libamxc/include app.c \
   -L /path/to/libamxc/output/x86_64-linux-gnu -lamxc \
   -Wl,-rpath,/path/to/libamxc/output/x86_64-linux-gnu -o app
```

## 1) 双向链表（llist）
把 `amxc_llist_it_t` **嵌进你的结构体**，就能把任意数据挂进链表。

```c
#include <stdio.h>
#include <amxc/amxc.h>

typedef struct { amxc_llist_it_t it; int value; } item_t;

static void ex_llist(void) {
    amxc_llist_t list;
    amxc_llist_init(&list);
    item_t a = { .value = 1 }, b = { .value = 2 };
    amxc_llist_append(&list, &a.it);
    amxc_llist_append(&list, &b.it);

    amxc_llist_for_each(it, (&list)) {
        item_t* p = amxc_llist_it_get_data(it, item_t, it);
        printf("%d ", p->value);
    }
    amxc_llist_clean(&list, NULL);
}
```
输出：
```
1 2
```

## 2) 哈希表（htable）
键值查找；同样把 `amxc_htable_it_t` 嵌进结构体。

```c
typedef struct { amxc_htable_it_t it; int value; } entry_t;

static void ex_htable(void) {
    amxc_htable_t ht;
    amxc_htable_init(&ht, 10);                 /* 10 是预留容量 */
    entry_t e = { .value = 42 };
    amxc_htable_insert(&ht, "answer", &e.it);

    amxc_htable_it_t* it = amxc_htable_get(&ht, "answer");
    entry_t* p = amxc_htable_it_get_data(it, entry_t, it);
    printf("answer=%d\n", p->value);

    amxc_htable_clean(&ht, NULL);
}
```
输出：
```
answer=42
```

## 3) 动态字符串（string）
自动扩容，不用自己算长度、`realloc`。

```c
static void ex_string(void) {
    amxc_string_t s;
    amxc_string_init(&s, 0);
    amxc_string_set(&s, "hello");
    amxc_string_appendf(&s, " %s #%d", "world", 42);
    printf("%s\n", amxc_string_get(&s, 0));
    amxc_string_clean(&s);
}
```
输出：
```
hello world #42
```

## 4) 通用类型（Variant）
像"带标签的联合体"：一个变量可以装 int / string / bool / 列表 / 哈希……

```c
static void ex_variant(void) {
    amxc_var_t v;
    amxc_var_init(&v);

    amxc_var_set(int32_t, &v, 42);
    printf("int32=%d\n", amxc_var_get_int32_t(&v));

    amxc_var_set(cstring_t, &v, "hi");
    printf("cstring=%s\n", amxc_var_get_const_cstring_t(&v));

    amxc_var_clean(&v);
}
```
输出：
```
int32=42
cstring=hi
```

## 5) 动态数组（array）
按下标访问；追加时自动扩容。

```c
static void ex_array(void) {
    amxc_array_t arr;
    amxc_array_init(&arr, 0);
    amxc_array_append_data(&arr, (void*)"a");
    amxc_array_append_data(&arr, (void*)"b");
    printf("%s %s\n",
           (char*)amxc_array_get_data_at(&arr, 0),
           (char*)amxc_array_get_data_at(&arr, 1));
    amxc_array_clean(&arr, NULL);
}
```
输出：
```
a b
```

## 6) 字符串集合（set）
做"标签/开关"很顺手：加 flag、判断、求交并差。

```c
static void ex_set(void) {
    amxc_set_t set;
    amxc_set_init(&set, false);
    amxc_set_add_flag(&set, "wifi");
    amxc_set_add_flag(&set, "wan");
    printf("wifi=%d lan=%d\n",
           amxc_set_has_flag(&set, "wifi"),
           amxc_set_has_flag(&set, "lan"));
    amxc_set_clean(&set);
}
```
输出：
```
wifi=1 lan=0
```

## 边界与注意
- **配对使用**：`init` ↔ `clean`、`new` ↔ `delete`，否则泄漏；
- **所有权**：容器默认**不接管**你放进去的数据（`clean(..., NULL)` 只清容器）；需要释放时传回调；
- **llist / htable 的 it 要嵌在结构体里**（侵入式容器），这是 C 里最常见、也最高效的做法；
- **Variant 有类型**：`set` 什么类型，就按什么类型取；
- 它**不是线程安全的**，并发场景要自己加锁。

## 一句话
> **`libamxc` 不是"prpl 的私有件"，它就是一套能直接用在任意 C 项目里的工业级容器库。**
> 先用它替掉你项目里那些 `list.c` / `hash.c`，你就知道省在哪。

---

> 下一篇：**《libamxc 的 Variant：C 里的"万能类型"》**——它怎么做到一个变量装下所有东西。
