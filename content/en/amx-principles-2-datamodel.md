---
title: "Ambiorix Data Model: Objects, Parameters, Paths (TR-181 style)"
summary: "The core of Ambiorix (AMX) is an addressable object tree: objects have parameters, functions, child objects and instances; paths locate them. This post covers objects, parameters, functions, paths, transactions, and why ODL is where readability comes from."
---

> Part 2 of *Understanding prplOS: Ambiorix and its libraries*. Based on the `libamxd` headers and the `libamxo` ODL documentation.

## One line
> **The data model is an addressable object tree: objects have parameters (state), functions (methods), child objects and instances; paths locate them.**

## 1. Object
- Created with `amxd_object_new`.
- Children via `amxd_object_add_object`; parameters via `amxd_object_add_param`; methods via `amxd_object_add_function`.
- **Multi-instance (tables)**: `amxd_object_add_instance`, `amxd_object_find_instance`, `amxd_object_first_instance`.

Objects have an owner: **the process that loads the ODL defining them is the data model server**; other processes are consumers/clients.

## 2. Parameter
- Defined with `amxd_param_new`.
- Read with `amxd_object_get_bool / get_int / get_double / get_cstring_t / get_amxc_ts_t`.
- Write through a **transaction** (next section), not directly.

## 3. Function
- `amxd_function_new` + `amxd_function_new_arg`.
- `amxd_function_set_impl` binds the implementation; deferred/async is available via `amxd_function_set_deferred_cb`.

## 4. Path
- Paths look like TR-181: `Device.WiFi.SSID.1.Enable`.
- `amxd_path_*` parses; `amxd_dm_findf(dm, "...")` resolves objects/parameters.
- **The path is the contract between configuration and code.**

## 5. Building the tree: code or ODL
- **Code**: `amxd_object_new` + `add_param / add_function / add_object`.
- **ODL**: `object` / `parameter` / `function` in `%define`, values in `%populate`; multi-instance tables use `object Name[]`.

**ODL is where readability comes from**: the structure lives in configuration, so you can see what the program has and does.

## 6. Transactions
Changes to multiple parameters must be atomic — no half-applied state.

```c
#include <amxd/amxd_dm.h>
#include <amxd/amxd_transaction.h>

amxd_status_t wifi_disable(amxd_dm_t* dm, int index)
{
    amxd_trans_t* trans = NULL;
    amxd_status_t status;

    status = amxd_trans_new(&trans);
    if (status != amxd_status_ok) return status;

    status = amxd_trans_select_pathf(trans, "Device.WiFi.SSID.%d.", index);
    if (status != amxd_status_ok) goto out;

    amxd_trans_set_bool(trans, "Enable", false);
    amxd_trans_set_cstring_t(trans, "Status", "Disabled");

    status = amxd_trans_apply(trans, dm);

out:
    amxd_trans_delete(&trans);
    return status;
}
```

- `amxd_trans_select_pathf` selects an object (printf-style paths).
- `amxd_trans_set_bool / set_cstring_t / set_int32_t ...` wrap `amxd_trans_set_param`.
- `amxd_trans_apply(trans, dm)` applies atomically and emits change events.
- `amxd_trans_delete(&trans)` releases the transaction, including on failure paths.

**When to use**: multiple related parameters, add/remove instances (`amxd_trans_add_inst` / `del_inst`), anything that must not expose intermediate state.

## 7. Relation to TR-181
TR-181 is the **standard data model**; an AMX object tree **can define a subset of TR-181** (the ODL docs say so explicitly).
So: **the standard defines names; AMX defines how to assemble and call them.**

## 8. One line
> **ODL says "what exists", code says "how it works", and the path is the contract.**

---

> Next: **Ambiorix Explained (3): libamxc in practice — six examples.**
