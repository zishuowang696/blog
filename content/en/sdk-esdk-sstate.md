---
title: "sstate vs SDK vs eSDK: the three most-confused things in Yocto"
summary: "sstate is a cache for the build machine, SDK is a toolchain for developers, eSDK packs both for offline system development. Here's how they differ and which one you want."
---

Three words come up constantly in Yocto — **sstate, SDK, eSDK** — and they get mixed up all the time. They are three different things. One line to tell them apart:

> **`sstate` is a cache for the build machine; `SDK` is a toolchain for developers; `eSDK` packs both so system developers can work offline.**

## 1. Comparison

| | `sstate` | `SDK` | `eSDK` (extensible SDK) |
| --- | --- | --- | --- |
| What it is | A **cache of task outputs** (objects, sysroots, native tools, packages…) | An installable **cross toolchain + the image's target sysroot** | **SDK + the sstate subset needed by that image + bitbake + devtool** |
| For whom | **bitbake itself** | **Application developers** | **System/distro developers** |
| What you can do | Skip re-running tasks on a cache hit | Cross-compile apps against the image's libs | **Offline** `devtool` modify/build, add recipes |
| Includes bitbake/devtool | ❌ | ❌ | ✅ |
| Can edit the build offline | ❌ | ❌ | ✅ |
| Typical size | **Largest** (15–40GB) | Medium (~1–3GB) | Large (several GB) |
| How to produce | Written automatically per build | `bitbake <image> -c populate_sdk` | `bitbake <image> -c populate_sdk_ext` |

## 2. How they relate (it's not a simple subset)

- **`sstate`**: a content-addressed cache — essentially a **warehouse of raw materials**, not a usable product, just a pile of hash-named directories.
- **`SDK`**: a **finished toolchain** packaged from the image sysroot — install it on another machine and cross-compile. It does **not** include a build system.
- **`eSDK`**: the SDK **plus the sstate subset for that image, plus bitbake metadata and devtool** — so you can **edit and rebuild recipes offline**.

> Analogy: `sstate` = the warehouse; `SDK` = a nice set of tools; `eSDK` = a **toolbox with materials** (tools + just enough stock + instructions).

## 3. Which one to use

| Scenario | Use |
| --- | --- |
| Local build tree exists, changing one recipe | **`sstate` + `devtool`** (lightest) |
| Just cross-compiling an app against the image | **`SDK`** |
| Don't want full builds locally; edit recipes **offline** | **`eSDK`** |
| New machine / no network | **`eSDK`** |

## 4. Lessons from the field

- **Size**: both `eSDK` and `sstate` can be many GB → split into **<2GiB parts** for object stores/Releases; slow to pull on slow links.
- **Same config required**: the eSDK must match your distro/machine. Change global knobs like `DISTRO_FEATURES` and old SDK/sstate signatures no longer match.
- **The eSDK is a snapshot**: adding a new layer or making large config changes still means going back to CI.
- **Principle**: **build everything in CI, do only increments locally.** Two local paths: (1) build tree + pulled sstate + `devtool`; (2) install the eSDK once, then work fully offline.

## 5. TL;DR

Don't treat `sstate` as an SDK, and don't expect an `SDK` to rebuild recipes. Decide whether you *build an app* or *maintain a distro*: app developers want `SDK`, system developers want `eSDK` — and `sstate` is always just the cache that makes builds fast.
