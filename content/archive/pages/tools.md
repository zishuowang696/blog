---
title: "工具下载"
date: 2026-10-14
---

这里放**本站自用、开源的小工具**，可直接下载。

## gh-download.sh — 国内友好的 GitHub 下载器

> 多镜像测速 + Range 校验 → aria2 多源并行 → 断点续传 →（有则）sha256 校验。

- **本站直链**：<https://embedai.com.cn/dl/gh-download.sh>
- **源码仓库**：<https://github.com/zishuowang696/embedai>（`scripts/gh-download.sh`）
- **讲解文章**：[/posts/gh-downloader](/posts/gh-downloader)

**用法**

```bash
# 1) 拿到脚本（本站直链）
curl -fsSL https://embedai.com.cn/dl/gh-download.sh -o gh-download.sh
chmod +x gh-download.sh

# 2) 按 owner/repo + tag 下（可 --pattern 过滤）
./gh-download.sh <owner/repo> <tag> [--pattern 'GLOB']... [-d DIR]

# 例：只下某个分卷
./gh-download.sh zishuowang696/embedai sstate-jetson --pattern 'sstate-*.part-*' -d ./sst

# 也可以直接给一个 GitHub 下载 URL
./gh-download.sh https://github.com/<owner>/<repo>/releases/download/<tag>/<file>
```

**依赖**：`curl`；`aria2c`（强烈推荐，缺失会回退 curl 并提示安装）；按 `owner/repo` 自动列资产时需要 `gh`。

**环境变量**：`EMBEDAI_MIRRORS`（镜像前缀，须支持 Range）、`EMBEDAI_JOBS`、`EMBEDAI_CONN`。

---

> 更多工具会陆续放上来。
