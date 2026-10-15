---
title: "一个零依赖的 GitHub 下载器：多镜像并行分段（纯 Python 标准库）"
date: 2026-10-14
tags: [github, 网络, python, 工程效率]
summary: "国内下 GitHub Release，直连慢、单镜像不稳。这个工具不用 aria2/curl，纯 Python 标准库实现：先探哪些镜像支持 Range(206)，再把同一个文件按分段分给多个镜像并行拉，最后按 GitHub 的 digest 校验 sha256。可 pip 安装，也能单文件跑。附实测输出。"
series: "工程效率"
published: true
---

做嵌入式发行版，**下载**经常是最大的时间黑洞：上游资产散在 GitHub，直连**慢/断**，随便一个代理**时好时坏**。

这篇介绍我写的下载器 **`gh-download`**——**零外部二进制依赖**：不需要 `aria2`、`curl`、`gh`、`jq`、`sha256sum`，纯 Python 标准库。

## 安装（两种）

```bash
# 推荐：pip 安装，命令即 gh-download
pip install gh-download-embedai

# 或：单文件脚本（只需 python3，不装任何东西）
curl -fsSL https://raw.githubusercontent.com/zishuowang696/gh-download/main/gh_download.py -o gh_download.py
python3 gh_download.py ...
```

- **PyPI**：<https://pypi.org/project/gh-download-embedai/>
- **源码 / Release**：<https://github.com/zishuowang696/gh-download>（Release 页可直接下载 `gh_download.py` 及 wheel/sdist）

## 核心思路（一句话）

> **先用 `Range` 请求筛出"能断点续传"的镜像，再把同一个文件按分段分给多个镜像并行拉。**

不是"一个镜像下、失败换下一个"，而是**多个镜像同时拉同一个文件的不同分段**。

## 三个关键细节

**1. 只信支持 `Range`（HTTP 206）的镜像**

有些代理返回 200 全量、不支持断点续传，并行/续传全是坑。所以先探一下（返回 206 才算合格）：

```python
# Range: bytes=0-0 -> 206 才合格
```

**2. 按偏移并行写，不用临时分片**

把文件切成 N 段，每段一个线程，按字节偏移直接写入目标文件（`os.pwrite`）——不需要把分片下到临时文件再拼。

**3. sha256 校验**

优先用 GitHub Release 资产自带的 `digest`（`sha256:...`）自动校验——**第三方代理不可全信**。

## 用法

```bash
# pip 版（命令即 gh-download）
gh-download <owner/repo> <tag> [--pattern GLOB]... [-d DIR] [--list]

# 单文件脚本版
python3 gh_download.py <owner/repo> <tag> --pattern 'GLOB' -d ./dl

# 例：只下某个平台的资产
gh-download BurntSushi/ripgrep latest --pattern '*x86_64-unknown-linux-musl.tar.gz' -d ./dl

# 也可直接给一个 GitHub 下载 URL
gh-download https://github.com/<owner>/<repo>/releases/download/<tag>/<file>
```

**环境变量**：`GH_DL_MIRRORS`（空格分隔的镜像，默认 `https://ghproxy.net` + `https://ghfast.top`，**必须支持 Range**）；`GH_DL_CONN`（每文件分段数，默认 8）；`GITHUB_TOKEN`（可选，提升 API 限额 / 访问私有仓库）。

**依赖**：**无**（pip 版；单文件版只需 `python3`）。

## 实测（真实输出）

拿一个普通资产试（ripgrep 的 musl 包，2.2MB）：

```console
$ gh-download BurntSushi/ripgrep latest --pattern '*x86_64-unknown-linux-musl.tar.gz' -d /tmp/dl-test
发布 15.2.0：1 个资产
  - ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz  (2.2 MiB)
→ ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz  (2.2 MiB)
  支持 Range 的源: 3/3
  sha256 ✓ 校验通过
完成 → /tmp/dl-test
  ✓ ripgrep-15.2.0-x86_64-unknown-linux-musl.tar.gz
```

- **3 个源（直连 + 两个镜像）都支持 Range** → 全部分段并行拉；
- 下完自动比对 GitHub 提供的 `digest` → **sha256 通过**。

**大文件**：同一个"探测 + 并行分段"思路，早前用 aria2 版测过 **Ghidra 12.1.4（543 MB）平均 4.7 MiB/s、一次下完**——对比直连/单镜像 ~0.19 MiB/s，快约 20 倍。

## 其它版本（可选）

- **本地 Web UI**（`gh-download-ui.ts`，需要 [Bun](https://bun.sh)）：粘贴 `owner/repo` + tag → 列资产 → 勾选 → 下载，日志实时滚动。
- **旧版 bash 脚本**（`gh-download.sh`，依赖 `curl` + `aria2c`）与 **Windows PowerShell 版**（`gh-download.ps1`）：接口相同，作为参考保留在仓库里。

## 经验 / 坑

- **镜像质量随时间变**：所以工具**先验 Range**再下，别凭印象写死一个；
- **第三方镜像不可信**：能校验就一定校验（sha256）；
- **别下敏感内容**走公共代理。

## 一句话

> **把"选哪个镜像"从'凭感觉'变成'先验 Range'，再把多个镜像当"分段源"并行拉——国内下 GitHub 就稳多了。**

（另：如果是**几十 GB 的工程依赖**，别逐个代理，直接让 **GitHub Actions 当下载代理**——见 [GitHub 下载加速与 CI 缓存](/posts/github-download-acceleration)。）
