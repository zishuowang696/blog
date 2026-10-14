---
title: "A China-friendly GitHub downloader: mirror speed-test + aria2 multi-source parallel"
summary: "Downloading GitHub Releases from a restricted network is slow and flaky. This script does three things: use a Range request to filter mirrors that support resume, then let aria2 pull the same file from several mirrors in parallel, then verify sha256 when available. Real output and usage included."
---

When you build an embedded distro, **downloading** is often the biggest time sink: assets are scattered across GitHub, direct connections are **slow/flaky**, and any single proxy is **up and down**.

This post is about a downloader I wrote: **`scripts/gh-download.sh`**.

- **Direct from this site**: <https://embedai.com.cn/dl/gh-download.sh>
- **Source repo**: <https://github.com/zishuowang696/gh-download>
- **Windows version**: `gh-download.ps1` (same repo; direct: <https://embedai.com.cn/dl/gh-download.ps1>)
- **Local Web UI** (single file): <https://embedai.com.cn/dl/gh-download-ui.ts> → run `bun gh-download-ui.ts`, open `http://localhost:8787` (list assets, pick, download)

![gh-download local Web UI: paste repo/tag, list assets, pick and download](/img/gh-download-ui.png)

## The core idea (one line)

> **First filter mirrors with a Range request (resumable), then let aria2 pull the same file from several mirrors in parallel.**

It's not "try one mirror, fall back to the next" — it's **many mirrors pulling the same file at once**.

## Three key details

**1. Only trust mirrors that support `Range` (HTTP 206)**

Some proxies return 200 (full body) and don't support resume — that breaks parallelism/resume. So probe first:

```bash
code=$(curl -s -o /dev/null -w '%{http_code}' -r 0-0 --max-time 20 "$url")
[ "$code" = "206" ]   # qualifies as a good mirror
```

**2. Put multiple mirrors for the *same file* on the *same line* (TAB-separated)**

This is the easiest trap: written as separate lines, aria2 will **download the same file twice**; on one line with multiple URIs, it treats them as **mirror sources**.

```
https://ghproxy.net/<url>\thttps://ghfast.top/<url>
  out=file.zip
```

**3. Resume + verify**

`aria2c -c` (resume); and if a `SHA256SUMS` is in the same batch, it runs `sha256sum -c` automatically — **third-party proxies are not to be fully trusted**.

## Usage

```bash
# by owner/repo + tag (auto-lists assets, --pattern to filter)
scripts/gh-download.sh <owner/repo> <tag> [--pattern GLOB]... [-d DIR]

# or a direct GitHub download URL
scripts/gh-download.sh https://github.com/<owner>/<repo>/releases/download/<tag>/<file>

# e.g. one specific part
scripts/gh-download.sh zishuowang696/embedai sstate-jetson --pattern 'sstate-*.part-*' -d ./sst
```

**Env vars**: `EMBEDAI_MIRRORS` (space-separated mirrors, default `ghproxy.net` + `ghfast.top`, **must support Range**); `EMBEDAI_JOBS` (parallel files, default 4), `EMBEDAI_CONN` (connections per file, default 8).

**Deps**: `curl`; `aria2c` (recommended — falls back to curl with install hints if missing); `gh` needed to list assets by `owner/repo` (otherwise it uses the public API + `jq`/`python3`).

## Real test (actual output)

Trying a normal asset (ripgrep's musl build, 2.4MB):

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

- Here only **`ghfast.top`** passed the Range probe (`ghproxy.net` didn't at the time) → it used just that one;
- If both pass, it puts **both mirrors on one line** and downloads in parallel.

**Large-file test**: try the **Ghidra 12.1.4 release (543 MB)**:

```console
$ scripts/gh-download.sh NationalSecurityAgency/ghidra Ghidra_12.1.4_build --pattern '*PUBLIC*.zip' -d ./ghidra
[#4fa3b8 543MiB/543MiB(99%) CN:1 DL:76KiB ETA:3s]
Download Results:
4fa3b8|OK  |   4.7MiB/s|./ghidra/ghidra_12.1.4_PUBLIC_20260921.zip
完成 → ./ghidra
```

- **543 MB at 4.7 MiB/s, in one go** (multi-mirror parallel);
- vs. direct/single-mirror ~0.19 MiB/s → **~20× faster**.

## Tips / gotchas

- **Mirror quality changes over time**: so the script **tests speed/Range first**, never hard-codes one;
- **Third-party mirrors aren't trustworthy**: verify sha256 whenever you can;
- **Don't pull sensitive content** through public proxies;
- **Missing aria2 = much slower** (curl fallback), so `apt install aria2` first.

## One line

> **Turn "which mirror" from a guess into a Range check, then let aria2 treat several mirrors as *mirror sources* — GitHub downloads on a restricted network get steady.**

(If it's **tens of GB of build deps**, don't proxy file-by-file — use **GitHub Actions as a download proxy**: see [GitHub download acceleration and CI caching](/en/posts/github-download-acceleration).)
