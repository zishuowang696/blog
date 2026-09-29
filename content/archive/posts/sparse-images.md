---
title: "稀疏镜像：为什么 14GB 的镜像其实只有 1GB"
date: 2026-09-29
tags: [yocto, 镜像, sparse, 压缩, bmaptool]
summary: "Yocto 的 ext4 镜像动辄十几 GB，上传却卡在 2GiB 上限——因为它大多是'空洞'。讲清怎么检测稀疏、怎么压缩、发布时该怎么发。"
series: "AI 网关实战"
published: true
---

做嵌入式镜像时你大概见过这种怪事：构建产出一个 **14GB 的 `.ext4`**，但上传到对象存储时却卡在 **单文件 2GiB 上限**；而你心里清楚——**里面的东西根本没那么多**。

这就是**稀疏文件（sparse file）**：**逻辑很大，物理很小**。这篇把它讲透：**怎么检测、怎么压缩、怎么发**。

## 一、稀疏文件是什么

稀疏文件里有大量"空洞（hole）"：**逻辑上占用很大，但全是 0 的区间不分配实际磁盘块**。

所以关键是分清两件事——**逻辑大小 ≠ 物理占用**：

| 工具 | 看的是 |
| --- | --- |
| `ls -l` / `stat -c %s` | **逻辑**大小（含空洞，例如 14GB） |
| `du` / `stat -c %b` | **物理**占用（真正分配的块，可能只有几百 MB） |

## 二、为什么 Yocto 镜像这么"稀释"

Yocto 的 `ext4` 镜像会按 **`ROOTFS_SIZE`**（目标文件系统大小）**预分配**，再把实际内容写进去——**没写满的部分就是空洞**。于是你得到一个"14GB"的文件，里面真正的数据可能只有几百 MB，其余全是 0。

相关变量：`IMAGE_ROOTFS_SIZE`、`IMAGE_OVERHEAD_FACTOR`、`IMAGE_ROOTFS_EXTRA_SPACE`。

## 三、怎么"检测"

```bash
ls -lh img.ext4          # 逻辑大小（14G）
du  -h img.ext4          # 物理占用（可能只有几百 M ← 说明稀疏）
stat -c 'size=%s  blocks=%b' img.ext4   # 物理 = %b × 512 字节
filefrag -v img.ext4     # 逐段列出 extent / hole
```

**判据**：`du`（物理）**远小于** `ls`（逻辑）→ 就是稀疏文件。

更专业的做法是 `bmaptool`：它生成一张**块映射（.bmap，哪些块非空）**，既能检测，也能用于"只写非空块"的快速刷机。

## 四、怎么"压缩"

**思路 1：直接压（简单，但慢）**

```bash
zstd img.ext4
```

0 的压缩率极高，14GB 能压到 ~1GB；**缺点**是压缩器要**读完整 14GB 的零**。

**思路 2：稀疏感知（推荐）**

```bash
tar --sparse -cf - img.ext4 | zstd   # tar 直接跳过空洞，再压 → 快
zstd --sparse img.ext4               # zstd 自带稀疏支持
cp --sparse=always a b               # 本地复制保留稀疏
rsync -S a b                         # rsync 保留稀疏
```

**思路 3：刷机最专业：`bmaptool`**

```bash
bmaptool create img.ext4 -o img.ext4.bmap   # 生成块映射
bmaptool copy   img.ext4 /dev/sdX           # 只写非空块（快、可校验）
```

## 五、发布时该怎么发

1. **别发"裸稀疏 ext4"**——它又大又空，还卡 2GiB 上限；
2. 发**压缩产物**：`*.tegraflash.tar.zst`（真正的刷机包）、`ext4.zst` / `ext4.gz`，并附 `.bmap`；
3. **若必须发裸镜像**：先 `zstd` 再发——大概率 <2GiB，**不用分卷**；
4. "分卷"是最后手段（把 14GB 的裸 ext4 切成 8 卷很浪费）。

在我们的 Jetson 发行版里，`meta-tegra` 本来就产出 `tegraflash-tar.zst`（压缩刷机包，只有 ~1.3GB）；真正"胖"的只有裸 `.ext4`——所以**发布时直接跳过它**即可。

## 六、一句话

**稀疏镜像 = "逻辑大、物理小"**：

- **检测**：`du`（物理）vs `ls`/`stat`（逻辑），或 `filefrag -v`、`bmaptool create`；
- **压缩**：`zstd` 最省事，`tar --sparse` / `zstd --sparse` 更快，`bmaptool` 最专业；
- **发布**：**只发压缩产物 + `.bmap`**，别发裸稀疏 `.ext4`。
