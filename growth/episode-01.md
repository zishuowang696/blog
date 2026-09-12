# 第 1 期素材包：为什么从 git submodule 迁到 KAS

- 关联文章：`/posts/yocto-tegra-kas-migration`
- 关联仓库：`embedai`
- 形式：屏录 + 板子特写（不露脸）+ TTS 配音

---

## 一、YouTube（英文）

### 标题候选
1. Why I Dropped Git Submodules for KAS (Yocto, Jetson Orin Nano)
2. One kas.yml to Pin Your Whole Yocto Build Tree
3. Managing a Jetson Yocto Distro: Submodules vs KAS

> 推荐 1（含关键词 + 反差）。

### 前 15 秒（钩子，必须先给结果）
> "I used to manage my Jetson Yocto distro with git submodules. Every layer drifted, every build was a mystery. Then I moved the whole thing to a single `kas.yml` — and my builds became reproducible. Here's why."

### 正文脚本（约 8–10 分钟，配合屏录）

**0:00–0:20 结果先行**
- 屏幕：`kas build` 成功输出 / `kas.yml` 文件。
- 口播：一句话结论 + 本期你会看到什么。

**0:20–2:00 问题：submodule 的痛**
- 展示 `.gitmodules`、多个子模块。
- 三个痛点：逐层 init/update；版本各自漂移；加层要改 bblayers。

**2:00–4:30 方案：一个 kas.yml**
- 打开 `embedai/kas.yml`，讲 `header.version`、`repos`（commit 锁定）、`layers`（优先级）、`machine` / `distro` / `target`。
- 强调：整棵树 = 一个可复现快照。

**4:30–6:30 日常三条命令**
- 屏幕演示：`kas checkout` → `kas build` → `kas shell`；排障用 `kas dump`。

**6:30–8:00 自建层 meta-embedai**
- 展示目录：`conf/distro/embedai.conf`、`conf/images`、`recipes-bsp/arm-trusted-firmware`、`recipes-core`。
- 讲"上游干净、覆盖集中"。

**8:00–9:00 收尾 + CTA**
- 结论：可复现是发行版最值钱的属性。
- CTA："Full write-up and the repo in the description. Subscribe if you maintain embedded Linux."

### 简介模板（Description）
```
I migrated my Jetson Orin Nano Yocto distro (embedai) from git submodules
to KAS. One kas.yml pins every upstream repo to a commit — reproducible builds.

Repo: https://github.com/zishuowang696/embedai
Write-up: https://blog-worker.zishuowang696.workers.dev/posts/yocto-tegra-kas-migration

Chapters:
0:00 Result first
0:20 The submodule pain
2:00 One kas.yml
4:30 kas checkout / build / shell
6:30 Inside meta-embedai
8:00 Wrap-up

#Yocto #Jetson #KAS #EmbeddedLinux #Tegra
```

### 封面文案（Thumbnail）
- 大标题：`SUBMODULES → KAS`
- 副标题：`1 file, reproducible Yocto`
- 背景：`kas.yml` 终端截图，红色叉 vs 绿色勾。

---

## 二、抖音（中文，竖屏）

### 片段 1：KAS 是什么（25–35 秒）
- 钩子（0–3s）："Yocto 还在手动 submodule？你迟早会被版本漂移坑死。"
- 正文：展示一堆 submodule → 切到 `kas.yml`；讲"一个文件声明所有层，锁死 commit"。
- 收尾："想看我真实发行版怎么迁的，评论区扣 1。"
- 标签：`#嵌入式 #Yocto #Jetson #Linux`

### 片段 2：三条命令（20–30 秒）
- 钩子："维护 Yocto 发行版，我日常只用三条命令。"
- 正文：`kas checkout` / `kas build` / `kas shell`，屏幕快速演示。
- 收尾："第四条是排障用的 kas dump，收藏。"

### 片段 3：翻车/对比（30–40 秒）
- 钩子："以前的构建：每层 submodule 手动对齐，错一次查半天。"
- 正文：对比表（submodule vs KAS）。
- 收尾："现在换机器、上 CI，结果一致。"

### 抖音简介
```
维护 Jetson Yocto 发行版：从 submodule 迁到 KAS。
仓库：github.com/zishuowang696/embedai
```

---

## 三、GitHub 动作

### Release notes（v0.1.0 示例）
```
## v0.1.0 — KAS-based reproducible build

- Migrated from tegra-demo-distro submodule layout to a single kas.yml
- All upstream repos pinned to commits (bitbake, oe-core, meta-tegra, ...)
- Own layer meta-embedai: distro `embedai`, image `embedai-image`, TF-A tweaks
- Daily workflow: kas checkout / kas build / kas shell

Video: <YouTube link>
Docs: docs/why-kas.md
```

### README 顶部建议
- 一句话：`A reproducible Yocto distro for Jetson Orin Nano, built with KAS.`
- 徽章：CI / latest release / license
- 快速开始：
```
git clone https://github.com/zishuowang696/embedai && cd embedai
kas checkout
kas build
```
- 架构图 + "Why KAS" 链接 + 视频链接。

### Topics
`yocto` `kas` `jetson` `tegra` `orin-nano` `embedded-linux` `edge-ai`

---

## 四、素材清单（录制前准备）
- [ ] 终端字体放大；`kas.yml`、目录结构、`kas build` 成功输出
- [ ] `kas dump` 输出片段
- [ ] 板子特写：Orin Nano 上电/接线（不露脸）
- [ ] 截图：`.gitmodules`、对比表

## 五、发布顺序（同一天）
1. GitHub：Release + README 更新（先有锚点）
2. YouTube：长视频 + 1 个 Short
3. 抖音：3 条片段
4. 三处互相挂链接
