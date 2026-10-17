---
title: "libamxc Examples: C Containers for Embedded (prplOS / Ambiorix)"
summary: "libamxc is the container library behind Ambiorix (prplOS): lists, hash tables, dynamic strings, variants, arrays and sets. Pure C, no C++ runtime, ~187 KB stripped, depends only on libc — usable in any C project. Six runnable examples."
---

> Part 3 of *Understanding prplOS: Ambiorix and its libraries*.
> Full runnable code: **https://github.com/zishuowang696/amx-examples**

## Why it matters
C has no standard containers. `libamxc` provides industrial-grade, reusable ones:

- **Pure C (C11)**, no C++ runtime (`ldd` shows only `libc`);
- `libamxc.so` is **~187 KB stripped**;
- License **BSD-2-Clause-Patent** (commercial-friendly);
- **Not tied to prpl or hardware** — usable in any C project.

Build (headers + the built `.so`):
```bash
cc -I /path/to/libamxc/include app.c \
   -L /path/to/libamxc/output/x86_64-linux-gnu -lamxc \
   -Wl,-rpath,/path/to/libamxc/output/x86_64-linux-gnu -o app
```

## 1) Doubly linked list (llist)
Embed `amxc_llist_it_t` in your struct.

```c
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
Output: `1 2`

## 2) Hash table (htable)
```c
typedef struct { amxc_htable_it_t it; int value; } entry_t;

static void ex_htable(void) {
    amxc_htable_t ht;
    amxc_htable_init(&ht, 10);
    entry_t e = { .value = 42 };
    amxc_htable_insert(&ht, "answer", &e.it);

    amxc_htable_it_t* it = amxc_htable_get(&ht, "answer");
    entry_t* p = amxc_htable_it_get_data(it, entry_t, it);
    printf("answer=%d\n", p->value);

    amxc_htable_clean(&ht, NULL);
}
```
Output: `answer=42`

## 3) Dynamic string
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
Output: `hello world #42`

## 4) Variant (generic typed value)
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
Output:
```
int32=42
cstring=hi
```

## 5) Dynamic array
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
Output: `a b`

## 6) String set (flags)
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
Output: `wifi=1 lan=0`

## Boundaries
- **Pair init/clean and new/delete**, or you leak.
- **Ownership**: containers do not take ownership by default (`clean(..., NULL)` just clears the container); pass a callback to free.
- **llist/htable are intrusive**: the `it` must be embedded in your struct.
- **Variant is typed**: set a type, get that type.
- **Not thread-safe**: add your own locking.

## One line
> **`libamxc` is not a private prpl component — it is an industrial-grade C container library you can use in any project.**

---

> Next: **Ambiorix Explained (4): is libamxc a C STL?**
