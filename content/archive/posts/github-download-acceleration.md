---
title: "GitHub 下载加速与 CI 缓存：把受限网络下的首次构建从几天压到几十分钟"
date: 2026-09-14
tags: [github, yocto, ci, 网络]
summary: "实测 GitHub 直连与国内代理速度，并把 GitHub Actions 当下载代理：在 runner 上 fetch 全部源码，打包成 Release 分卷缓存，本地拉回后离线构建。"
series: "工程效率"
published: true
---

做嵌入式发行版，第一次构建经常慢得离谱——**瓶颈几乎从来不是编译，而是下载**。上游源码散落在 GitHub、kernel.org、SourceForge、huggingface……在受限网络下，随便一个源卡住就能拖掉一整天。

这篇讲两件事：**先测速再选路**，以及**把 GitHub Actions 当成下载代理**，把"下载"和"编译"彻底拆开。

> 案例仓库：[embedai](https://github.com/zishuowang696/embedai)（Jetson Orin Nano 的 Yocto 发行版，KAS 管理）。

## 一、先测速，别猜

镜像/代理的质量随时间变化，凭印象选源必然踩坑。写了个小脚本，对**同一个 URL** 各取 20MB，打印实际速度：

```bash
scripts/speedtest-github.sh [URL] [MB]
```

实测结果（2026-09，单连接取 20MB）：

| 源 | 速度 | 结论 |
| --- | --- | --- |
| 直连 `github.com` | 超时 / 0 | ❌ 不稳定 |
| `ghproxy.net` | **1.19 MB/s** | ✅ 最快 |
| `gh-proxy.com` | 0.69 MB/s | ✅ 可用 |
| `ghfast.top` | 0.22 MB/s | 慢 |
| 其余几个常见代理 | 失败 | ❌ 已失效 |

结论：**单连接有上限，但可以叠加**——6 路并行大约能到 5–6 MB/s。

## 二、小文件：代理前缀就够

GitHub Release 资产可以直接在 URL 前拼代理：

```bash
curl -L -C - -O "https://ghproxy.net/https://github.com/<owner>/<repo>/releases/download/<tag>/<file>"
```

`-C -` 断点续传；多文件用 `curl -Z --parallel-max 6` 并行。**下载完务必 `sha256sum -c` 校验**——第三方代理不可全信。

## 三、大工程：让 GitHub 当下载代理

Yocto 要下的是**几十 GB、上千个文件**，逐个代理不现实。换个思路：

> GitHub Actions 的 runner 不受墙影响。**让它在云端把源码全部 fetch 下来，打包，本地再拉回。**

### 存储选型（关键）

| 资源 | 限制 | 适合吗 |
| --- | --- | --- |
| **Release assets** | 单文件 <2 GiB、单 release ≤1000 个、**总大小/带宽不限** | ✅ |
| Actions cache | **每仓库 10 GB** | ❌ |
| Actions artifacts | Free 仅 500 MB 且会过期 | ❌ |

所以走 **Release 分卷**：不占 Actions cache 配额，公开仓库 Actions 分钟也免费。

### 工作流

`fetch-cache.yml` 干这几件事：

1. runner 上 `kas checkout` + `bitbake -k --runall=fetch embedai-image`（只下载，不编译）
2. `downloads/` 打包成 **1.9GB 分卷**，生成 `SHA256SUMS`
3. 上传到 Release（tag `dl-cache`，标记 prerelease）

实测：**20.6 GB / 11 个分卷，全流程约 40 分钟**。作为对比，同样的下载在受限网络下能拖到几天。

## 四、本地拉回，离线构建

```bash
EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6 路并行 + 断点续传 + SHA256 校验 + 解压进 DL_DIR

BB_NO_NETWORK="1" kas build kas.yml
```

`BB_NO_NETWORK=1` 强制离线——**如果还缺源会立刻报错**，能精确暴露问题，而不是卡在某个慢连接上。

## 五、经验

- **先测速**，再决定用哪个镜像；把结果和日期记下来。
- **下载与编译分离**：`--runall=fetch` 只拉源码，可中断、可重跑。
- **大缓存用 Release，不要用 Actions cache**（10GB 上限）。
- Yocto 源优先用 **bitbake 镜像**（kernel.org 用 USTC、huggingface 用 hf-mirror），比逐个代理 GitHub 更稳。
- 任何第三方代理都**不要用于敏感内容**，且必须校验哈希。

相关脚本与文档都在 [embedai](https://github.com/zishuowang696/embedai)：`scripts/speedtest-github.sh`、`scripts/pull-dl-cache.sh`、`docs/10-github-mirrors.md`。
