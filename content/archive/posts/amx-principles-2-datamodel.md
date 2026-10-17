---
title: "Ambiorix 原理（2）：数据模型——对象、参数与路径"
date: 2026-10-18
tags: [prpl, amx, 架构, 嵌入式]
series: "深入理解 PRPL 之 Ambiorix 相关库"
summary: "AMX 的核心是一棵可寻址的对象树：对象有参数、函数、子对象和实例，路径负责定位。这篇讲清对象/参数/函数/路径/事务，以及为什么 ODL 是「可读性」的来源。"
published: true
---

> 系列第 2 篇。第 1 篇：[AMX 原理（1）](/posts/amx-principles-1-container-bus-datamodel)。
> 本文基于 `libamxd` 头文件与 `libamxo` 的 ODL 文档；具体 API 以实际版本为准。

## 一句话
> **数据模型是一棵"可寻址的对象树"：对象有参数（状态）、函数（方法）、子对象、实例；路径用来定位它们。**

## 1. 对象（Object）
- 用 `amxd_object_new` 创建；
- 用 `amxd_object_add_object` 挂**子对象**、`amxd_object_add_param` 加**参数**、`amxd_object_add_function` 加**方法**；
- **多实例（表）**：`amxd_object_add_instance`、`amxd_object_find_instance`、`amxd_object_first_instance`。

对象是有"归属"的：**谁加载了定义它的 ODL，谁就是它的 owner（data model server）**；其他进程是 consumer/client。

## 2. 参数（Parameter）
- 用 `amxd_param_new` 定义；
- 读：`amxd_object_get_bool / get_int / get_double / get_cstring_t / get_amxc_ts_t`（按类型取）；
- 写：**走事务**（见第 6 节），而不是直接改。

## 3. 函数（Function）
- `amxd_function_new` + `amxd_function_new_arg` 定义方法；
- `amxd_function_set_impl` 绑定实现；
- 还能设置 deferred/async（`amxd_function_set_deferred_cb`）。

## 4. 路径（Path）
- 对象树用路径定位，风格与 TR-181 一致，例如 `Device.WiFi.SSID.1.Enable`；
- `amxd_path_*` 负责解析；`amxd_dm_findf(dm, "...")` 负责在一棵树上找到对象/参数。
- **路径是"配置"和"代码"之间的契约**：客户端按路径查，服务端按路径暴露。

## 5. 谁来建这棵树：代码，还是 ODL
两种方式：

- **代码**（命令式）：`amxd_object_new` + `add_param / add_function / add_object`；
- **ODL**（声明式）：在 `%define` 里写 `object` / `parameter` / `function`，`%populate` 里填值；多实例表用 `object Name[]`。

**后者才是"可读性"的来源**：结构写在配置里，一眼能看出"这个程序有什么、能干什么"。

## 6. 事务（Transaction）
改多个参数要**原子**——不能出现"改了一半"的中间状态。

**事务 = 把"选对象 + 改多个参数 / 加删实例"打包，最后 `apply` 时一次性提交。**

```c
#include <amxd/amxd_dm.h>
#include <amxd/amxd_transaction.h>

/* 把某个 Wi-Fi 实例关掉：Enable=false，同时更新 Status */
amxd_status_t wifi_disable(amxd_dm_t* dm, int index)
{
    amxd_trans_t* trans = NULL;
    amxd_status_t status;

    status = amxd_trans_new(&trans);
    if (status != amxd_status_ok) return status;

    /* 1) 选中对象（选的是"对象路径"） */
    status = amxd_trans_select_pathf(trans, "Device.WiFi.SSID.%d.", index);
    if (status != amxd_status_ok) goto out;

    /* 2) 同一事务里改多个参数：要么全成功，要么全不改 */
    amxd_trans_set_bool(trans, "Enable", false);
    amxd_trans_set_cstring_t(trans, "Status", "Disabled");

    /* 3) 原子提交 */
    status = amxd_trans_apply(trans, dm);

out:
    amxd_trans_delete(&trans);
    return status;
}
```

要点：
- `amxd_trans_select_pathf`：选中对象（路径支持 printf 风格）；
- `amxd_trans_set_bool / set_cstring_t / set_int32_t ...`：都是 `amxd_trans_set_param` 的辅助封装；
- `amxd_trans_apply(trans, dm)`：一次性应用，并触发变更事件；
- `amxd_trans_delete(&trans)`：释放事务（失败路径也要调，避免泄漏）。

**什么时候该用**：改多个相关参数（如 `Enable` + `Status` + `LastChange`）、加/删实例（`amxd_trans_add_inst` / `del_inst`）、任何"不能出现中间状态"的修改。

## 7. 和 TR-181 的关系
TR-181 是**标准数据模型**；AMX 的对象树**可以直接定义 TR-181 的一部分**（ODL 文档明确支持）。
所以：**标准负责"叫什么"，AMX 负责"怎么装、怎么调"。**

## 8. 一句话
> **ODL 说"有什么"，代码说"怎么做"，路径是两者的契约。**

---

> 下一篇：**《AMX 原理（3）：一次 RPC 的全链路》**——从客户端调用到组件处理，中间到底发生了什么。
