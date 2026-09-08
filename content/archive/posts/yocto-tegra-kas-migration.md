---
title: "把 Tegra/Jetson 的 Yocto 发行版从 git submodule 迁到 KAS，为什么"
date: 2026-09-07
tags: [yocto, tegra, kas]
summary: "用真实仓库 embedai 讲清：多上游层的 Yocto 项目为什么值得从 tegra-demo-distro 式 submodule 切到声明式 KAS——一个 kas.yml 钉住版本、配置即文档、日常只剩三条命令。"
published: true
---

做嵌入式发行版最容易被“层”淹没：OpenEmbedded 的每个功能都是单独的 repo，凑齐一套能构建的树要手工对齐一堆版本。这篇用真实仓库 [embedai](https://github.com/zishuowang696/embedai) 复盘我为什么把它的 Tegra/Jetson 发行版从 **git submodule** 迁到 [KAS](https://github.com/siemens/kas)。

> 背景：`embedai` 是为 **Jetson Orin Nano**（`jetson-orin-nano-devkit-nvme`）做的自建 Yocto 发行版——`distro: embedai`、目标镜像 `embedai-image`，上层基于 OE4T 的 `meta-tegra` 与官方 `tegra-demo-distro` 基线。

## 1. 起点：tegra-demo-distro 的 submodule 方案

NVIDIA 官方（OE4T 维护的 **tegra-demo-distro**）用 git submodule 管理上游层：`bitbake`、`openembedded-core`、`meta-openembedded`、`meta-tegra`、`meta-tegra-community`……每层一个 submodule。它把“怎么把一堆 git 仓库拼成一个构建树”这件事，写成了散落的 `.gitmodules` 配置和一段段 shell 脚本。

这套方案的问题会随仓库数量线性放大：

- 每个 submodule 要各自 `init` / `update`，版本靠 submodule 指针各自漂移，没人保证“这一整套”彼此兼容；
- 加一个层 = 改 submodule + 手改 `bblayers.conf`，两步都容易出错；
- 换机器、上 CI，得把整套手工流程再走一遍；
- “为什么这个 commit？”——答案藏在历史里，不在配置里。

## 2. 迁移：一个 kas.yml 取代全部手工

KAS 是“配置即构建”的位：用一份 `kas.yml` 声明**拉哪些 repo、锁到哪个 commit、启用哪些 layer 及优先级**，再加 `machine` / `distro` / `target`，工具负责把声明的状态变成可构建的目录。`embedai` 迁移后，整个“多仓库 + 层 + 构建目标”都在 `kas.yml` 顶层：

```yaml
header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:        { prio: 85 }
      meta-python:    { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai
```

> `header.version` 对应你本机安装的 KAS 配置版本；例子里写 `22` 代表较新的配置语法，请以 [kas 文档](https://kas.readthedocs.io) 与仓库 `kas.yml` 实际值为准。

### 对比

| 维度 | tegra-demo-distro（git submodule） | 本仓库（KAS） |
|------|-----------------------------------|---------------|
| 多仓库管理 | 每层一个 submodule，逐个子模块 `init/update`、手工对齐版本 | 一个 `kas.yml` 声明所有 repo + 层，`kas checkout` 一次搞定 |
| 版本一致性 | 依赖 submodule 指针，各自推进、易漂移 | 每个 repo 锁到 **commit**，整树是一个可复现快照 |
| 换层 / 加层 | 手工改 submodule + 改 bblayers，易错 | `repos:` / `layers:` 加几行即可 |
| 构建入口 | 记一串 bitbake/环境命令 | `kas build` / `kas shell` / `kas dump`，配置即文档 |
| 可裁剪性 | 在官方 distro 上层层叠叠地改 | distro/image/层都归自建 `meta-embedai`，想删就删 |
| CI / 自动化 | 脚本难维护 | kas 命令可直接进 GitHub Actions |

## 3. 日常其实只剩三条命令

```
kas checkout   # 拉齐所有层到锁定的 commit
kas build      # 构建目标镜像（embedai-image）
kas shell      # 进 bitbake 环境做细活
```

排障时常用的还有：

```
kas dump       # 看解析后的完整配置（机器/distro/层实际生效值）
```

`kas build` 内部替你完成 `bitbake-layers` 生成 `bblayers.conf`、注入 `machine`/`distro` 的整套“初始化仪式”。这也意味着：**配置本身就是文档**——任何人拿到仓库，不需要脑内保留一串步骤就能复现构建。

## 4. 自建层 meta-embedai：把“自己的东西”收拢一处

`embedai` 的自有改动全部收在自建层 `meta-embedai/`：

```text
meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # 自定义 distro：embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A 兼容性定制
└── recipes-core/               # 镜像配方（embedai-image）等
```

好处是边界清晰：上游层保持“干净”，一切覆盖（distro 定义、镜像内容、BSP 补丁）都在自己的层里，删掉不用的东西只动一层。

## 5. 可复现，才是发行版最值钱的属性

`kas.yml` 里每个上游 repo 都锁在完整 commit 上，所以：

- 换机器、重装环境、进 CI，结果一致；
- 出问题时能精准回答“到底是哪个 commit 引入的”；
- 升级某个上游 = 改一行 commit，重跑一遍，风险可见。

## 6. 想加层？先检索再声明

以后要接 OpenWrt 相关（或任何 OE 层），流程固定：先在 <https://layers.openembedded.org> 检索合适的 layer → 在 `kas.yml` 的 `repos:` 加 repo、`layers:` 声明路径与优先级 → `kas checkout && kas build`。不用再碰 `bblayers.conf`。

## 相关链接

- **embedai**（本仓库，含完整 `kas.yml` 与 `meta-embedai/`）：<https://github.com/zishuowang696/embedai>
- **KAS**（配置/构建工具）：<https://github.com/siemens/kas> · 文档 <https://kas.readthedocs.io>
- **tegra-demo-distro**（submodule 方案，本项目前身基线）：<https://github.com/OE4T/tegra-demo-distro>
- **meta-tegra**（Jetson BSP 层）：<https://github.com/OE4T/meta-tegra>
- **meta-tegra-community**：<https://github.com/OE4T/meta-tegra-community>
- **OpenEmbedded Core / bitbake**：<https://github.com/openembedded/openembedded-core>
- **meta-openembedded**（meta-oe 等）：<https://github.com/openembedded/meta-openembedded>
- **meta-virtualization**：<https://git.yoctoproject.org/meta-virtualization>

> 备忘：接 OpenWrt 系内容前，先在 <https://layers.openembedded.org> 检索，再进 `kas.yml`。
