---
title: "一个国内友好的 GitHub 下载器：多镜像测速 + aria2 多源并行"
date: 2026-10-14
tags: [github, 网络, bash, 工程效率]
summary: "国内下 GitHub Release，直连慢、单镜像不稳。这个脚本干了三件事：先用 Range 请求筛出能断点续传的镜像，再让 aria2 把同一个文件的多个镜像当『镜像源』并行拉，最后（有的话）校验 sha256。附实测输出与用法。"
series: "工程效率"
published: true
---

做嵌入式发行版，**下载**经常是最大的时间黑洞：上游资产散在 GitHub，直连**慢/断**，随便一个代理**时好时坏**。

这篇介绍一个自己写的下载器：**`scripts/gh-download.sh`**。

- **本站直链**：<https://embedai.com.cn/dl/gh-download.sh>
- **源码仓库**：<https://github.com/zishuowang696/embedai>（`scripts/gh-download.sh`）

## 核心思路（一句话）

> **先用 Range 请求筛出"能断点续传"的镜像，再让 aria2 把同一个文件的多个镜像当"镜像源"并行拉。**

不是"一个镜像下、失败换下一个"，而是**多个镜像同时拉同一个文件**。

## 三个关键细节

**1. 只信支持 `Range`（HTTP 206）的镜像**

有些代理返回 200 全量、不支持断点续传，并行/续传全是坑。所以先探一下：

```bash
code=$(curl -s -o /dev/null -w '%{http_code}' -r 0-0 --max-time 20 "$url")
[ "$code" = "206" ]   # 才算合格镜像
```

**2. 同一文件的多个镜像，要放在 aria2 输入的"同一行"（TAB 分隔）**

这是最容易踩的坑：写成多行，aria2 会**把同一个文件下两遍**；放同一行 + 多个 URI，它才当**镜像源**并行。

```
https://ghproxy.net/<url>\thttps://ghfast.top/<url>
  out=file.zip
```

**3. 断点续传 + 校验**

`aria2c -c`（续传）；如果同批资产里有 `SHA256SUMS`，自动 `sha256sum -c` 校验——**第三方代理不可全信**。

## 用法

```bash
# 按 owner/repo + tag（自动列资产，可 --pattern 过滤）
scripts/gh-download.sh <owner/repo> <tag> [--pattern GLOB]... [-d DIR]

# 或直接给一个 GitHub 下载 URL
scripts/gh-download.sh https://github.com/<owner>/<repo>/releases/download/<tag>/<file>

# 例：只下某一个分卷
scripts/gh-download.sh zishuowang696/embedai sstate-jetson --pattern 'sstate-*.part-*' -d ./sst
```

**环境变量**：
- `EMBEDAI_MIRRORS`：空格分隔的镜像（默认 `ghproxy.net` + `ghfast.top`），**必须支持 Range**；
- `EMBEDAI_JOBS`（并发文件数，默认 4）、`EMBEDAI_CONN`（每文件分段数，默认 8）。

**依赖**：`curl`；`aria2c`（推荐，缺失会回退 curl 并提示各平台安装命令）；按 `owner/repo` 列资产时需要 `gh`（否则走公开 API + `jq`/`python3`）。

## 实测（真实输出）

拿一个普通资产试（ripgrep 的 musl 包，2.4MB）：

```console
$ scripts/gh-download.sh BurntSushi/ripgrep 14.1.0 --pattern '*x86_64-unknown-linux-musl.tar.gz' -d /tmp/dl-test
镜像可用(Range): https://ghfast.top
开始下载 → /tmp/dl-test
[#48d111 1.6MiB/2.4MiB(66%) CN:1 DL:131KiB ETA:6s]
Download Results:
gid   |stat|avg speed  |path/URI
48d111|OK  |   191KiB/s|/tmp/dl-test/ripgrep-14.1.0-x86_64-unknown-linux-musl.tar.gz
（无 SHA256SUMS，跳过校验）
完成 → /tmp/dl-test
```

- 本例只探测到 **`ghfast.top`** 支持 Range（`ghproxy.net` 当时没通过）→ 就只用它下；
- 若两个都可用，就会**把两个镜像放进同一行并行拉**。

## 经验 / 坑

- **镜像质量随时间变**：所以脚本**先测速/验 Range**再下，别凭印象写死一个；
- **第三方镜像不可信**：能校验就一定校验（sha256）；
- **别下敏感内容**走公共代理；
- **aria2 缺失会明显变慢**（回退单连接），先 `apt install aria2`。

## 一句话

> **把"选哪个镜像"从'凭感觉'变成'先验 Range'，再让 aria2 把多个镜像当"镜像源"并行拉——国内下 GitHub 就稳多了。**

（另：如果是**几十 GB 的工程依赖**，别逐个代理，直接让 **GitHub Actions 当下载代理**——见 [GitHub 下载加速与 CI 缓存](/posts/github-download-acceleration)。）
