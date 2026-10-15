---
title: "工具下载"
date: 2026-10-14
---

这里放**本站自用、开源的小工具**，可直接使用。

## gh-download — 零依赖的 GitHub 下载器

> 多镜像并行分段（Range 校验）→ 断点续传 →（有则）sha256 校验。**纯 Python 标准库，不需要 aria2 / curl / gh / jq。**

- **PyPI**：<https://pypi.org/project/gh-download-embedai/>
- **源码 / Release**：<https://github.com/zishuowang696/gh-download>
- **讲解文章**：[/posts/gh-downloader](/posts/gh-downloader)

**安装（推荐 pip）**

```bash
pip install gh-download-embedai      # 或 uv tool install / pipx install gh-download-embedai
```

**用法**

```bash
# 按 owner/repo + tag 下（可 --pattern 过滤）
gh-download <owner/repo> <tag> [--pattern 'GLOB']... [-d DIR] [--list]

# 例：只下某个分卷
gh-download zishuowang696/embedai sstate-jetson --pattern 'sstate-*.part-*' -d ./sst

# 也可以直接给一个 GitHub 下载 URL
gh-download https://github.com/<owner>/<repo>/releases/download/<tag>/<file>
```

**单文件版**（不想装包时；只需 `python3`）

```bash
curl -fsSL https://github.com/zishuowang696/gh-download/releases/latest/download/gh_download.py -o gh_download.py
python3 gh_download.py <owner/repo> <tag> --pattern 'GLOB' -d ./dl
```

**环境变量**：`GH_DL_MIRRORS`（镜像前缀，须支持 Range）、`GH_DL_CONN`（分段数）、`GITHUB_TOKEN`（可选）。

### 其它版本（可选）

- **Windows / PowerShell 版**：`gh-download.ps1`（<https://embedai.com.cn/dl/gh-download.ps1>）
- **旧版 bash 脚本**：`gh-download.sh`（依赖 `curl` + `aria2c`）<https://embedai.com.cn/dl/gh-download.sh>
- **本地 Web UI**（需 [Bun](https://bun.sh)，单文件）：`gh-download-ui.ts`（<https://embedai.com.cn/dl/gh-download-ui.ts>）→ `bun gh-download-ui.ts`，浏览器打开 `http://localhost:8787`，粘贴 `owner/repo` + `tag` → 列资产 → 勾选 → 下载。

![gh-download 本地 Web UI](/img/gh-download-ui.png)

---

> 更多工具会陆续放上来。
