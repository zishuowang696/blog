---
title: "sstate / SDK / eSDK：Yocto 里三个最容易搞混的东西"
date: 2026-09-28
tags: [yocto, sdk, esdk, sstate, 构建]
summary: "sstate 是给构建机的缓存，SDK 是给开发者的工具链，eSDK 是两者打包。弄清这三个，才知道本地开发该怎么下手。"
series: "AI 网关实战"
published: true
---

在 Yocto 里做开发，绕不开三个词：**sstate、SDK、eSDK**。它们经常被混着说，其实是**三样不同的东西**。一句话先分清：

> **`sstate` 是"给构建机的缓存"，`SDK` 是"给开发者的工具链"，`eSDK` 是"把两者打包，给系统开发者离线用"。**

## 一、对比

| | `sstate` | `SDK` | `eSDK`（可扩展 SDK） |
| --- | --- | --- | --- |
| 是什么 | 任务中间产物的**缓存**（对象文件、sysroot、native 工具、rpm 包…） | 可安装的**交叉工具链 + 镜像的目标 sysroot** | **SDK + 该镜像所需的 sstate 子集 + bitbake + devtool** |
| 给谁用 | **bitbake 自己** | **应用开发者** | **系统/发行版开发者** |
| 能干什么 | 跳过重编（命中即复用） | 交叉编译应用、链接镜像里的库 | **离线** `devtool` 改/加 recipe、重编 |
| 含 bitbake / devtool | ❌ | ❌ | ✅ |
| 能离线改构建 | ❌ | ❌ | ✅ |
| 典型体积 | **最大**（15–40GB） | 中（~1–3GB） | 大（数 GB） |
| 怎么生成 | 每次构建自动写 | `bitbake <image> -c populate_sdk` | `bitbake <image> -c populate_sdk_ext` |

## 二、它们的关系（不是简单的"子集"）

- **`sstate`**：内容寻址的缓存，本质是"**原料仓库**"——不是给人用的成品，而是一堆哈希目录。
- **`SDK`**：从镜像的 sysroot 打包出的**成品工具链**——拿到别的机器装完就能编应用，但**不含构建系统**。
- **`eSDK`**：在 SDK 基础上**塞进该镜像所需的 sstate 子集 + bitbake 元数据 + devtool**，于是**离线也能改 recipe、重编**。

> 类比：`sstate` = 车间仓库；`SDK` = 一套精巧工具；`eSDK` = **带料的工具箱**（工具 + 够用的原料 + 说明）。

## 三、怎么选

| 场景 | 用什么 |
| --- | --- |
| 本地已有构建树、只改单个 recipe | **`sstate` + `devtool`**（最轻） |
| 只想交叉编个应用、链接镜像里的库 | **`SDK`** |
| 本地不想跑全量、要**离线**改 recipe/加包 | **`eSDK`** |
| 换新机器 / 无网环境做开发 | **`eSDK`** |

## 四、我们走过的坑（经验）

- **体积**：`eSDK` 和 `sstate` 都可能好几 GB → 放对象存储/Release 时要**分卷（单文件 <2GiB）**；慢网下载也慢。
- **配置必须一致**：eSDK 与目标必须同 distro/machine。改过 `DISTRO_FEATURES` 这类全局项后，旧 SDK/sstate 里的签名就对不上了。
- **eSDK 是快照**：它的元数据是"拍下来的"，**加新 layer / 大改配置**仍需回 CI 重出。
- **原则**：**CI 编全量 → 本地只做增量**。本地两条路径：① 构建树 + 拉 sstate + `devtool`；② 装 eSDK（重一次，之后完全离线）。

## 五、一句话总结

**别把 sstate 当 SDK 用，也别指望 SDK 能改构建。** 想清楚你是"编应用"还是"改发行版"，再决定装哪个：应用开发者要 `SDK`，系统开发者要 `eSDK`，而 `sstate` 永远只是背后那个让构建变快的缓存。
