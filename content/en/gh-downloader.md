---
title: "A zero-dependency GitHub downloader: multi-mirror parallel ranged download (pure Python stdlib)"
summary: "Downloading GitHub Releases from a restricted network is slow and flaky. This tool uses no aria2/curl/gh/jq — just the Python standard library: probe which mirrors support Range (206), split the file across mirrors and pull segments in parallel, then verify sha256 from GitHub's digest. pip-installable, or run as a single file. Real output included."
---

When you build an embedded distro, **downloading** is often the biggest time sink: assets are scattered across GitHub, direct connections are **slow/flaky**, and any single proxy is **up and down**.

This post is about a downloader I wrote: **`gh-download`** — **zero external binaries** (no `aria2`, `curl`, `gh`, `jq`, `sha256sum`; pure Python standard library).

## Install (two ways)

```bash
# Recommended: pip install, the command is gh-download
pip install gh-download-embedai

# Or: single-file script (needs only python3, installs nothing)
curl -fsSL https://raw.githubusercontent.com/zishuowang696/gh-download/main/gh_download.py -o gh_download.py
python3 gh_download.py ...
```

- **PyPI**: <https://pypi.org/project/gh-download-embedai/>
- **Source / Releases**: <https://github.com/zishuowang696/gh-download> (grab `gh_download.py` or the wheel/sdist right from the Release page)

## The core idea (one line)

> **First probe which mirrors support Range (resumable, HTTP 206), then split one file into segments and pull them from several mirrors in parallel.**

It's not "try one mirror, fall back to the next" — it's **many mirrors pulling different segments of the same file at once**.

## Three key details

**1. Only trust mirrors that support `Range` (HTTP 206)**

Some proxies return 200 (full body) and don't support resume — that breaks parallelism/resume. So probe first (206 qualifies):

```python
# Range: bytes=0-0 -> 206 qualifies
```

**2. Parallel writes by offset, no temp parts**

Split the file into N segments, one thread each, written straight into the target file at the byte offset (`os.pwrite`) — no downloading parts to temp files and merging afterwards.

**3. Verify sha256**

Prefer GitHub's own asset `digest` (`sha256:...`) and verify automatically — **third-party proxies are not to be fully trusted**.

## Usage

```bash
# pip version (command is gh-download)
gh-download <owner/repo> <tag> [--pattern GLOB]... [-d DIR] [--list]

# single-file version
python3 gh_download.py <owner/repo> <tag> --pattern 'GLOB' -d ./dl

# e.g. one platform's asset
gh-download BurntSushi/ripgrep latest --pattern '*x86_64-unknown-linux-musl.tar.gz' -d ./dl

# or a direct GitHub download URL
gh-download https://github.com/<owner>/<repo>/releases/download/<tag>/<file>
```

**Env vars**: `GH_DL_MIRRORS` (space-separated mirrors, default `https://ghproxy.net` + `https://ghfast.top`, **must support Range**); `GH_DL_CONN` (segments per file, default 8); `GITHUB_TOKEN` (optional, raises API limits / private repos).

**Deps**: **none** (pip version; the single-file version needs only `python3`).

## Real test (actual output)

Trying a normal asset (ripgrep's musl build, 2.2MB):

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

- **All 3 sources (direct + two mirrors) support Range** → everything runs as parallel segments;
- It auto-compares against GitHub's `digest` → **sha256 passes**.

**Large files**: same "probe + parallel segments" idea — an earlier aria2 version measured **Ghidra 12.1.4 (543 MB) at 4.7 MiB/s in one go**, ~20× faster than direct/single-mirror (~0.19 MiB/s).

## Other versions (optional)

- **Local Web UI** (`gh-download-ui.ts`, needs [Bun](https://bun.sh)): paste `owner/repo` + tag → list assets → pick → download, with live logs.
- **Legacy bash script** (`gh-download.sh`, needs `curl` + `aria2c`) and a **Windows PowerShell version** (`gh-download.ps1`): same interface, kept in the repo for reference.

## Tips / gotchas

- **Mirror quality changes over time**: so the tool **checks Range first**, never hard-codes one;
- **Third-party mirrors aren't trustworthy**: verify sha256 whenever you can;
- **Don't pull sensitive content** through public proxies.

## One line

> **Turn "which mirror" from a guess into a Range check, then treat several mirrors as *segment sources* and download in parallel — GitHub downloads on a restricted network get steady.**

(If it's **tens of GB of build deps**, don't proxy file-by-file — use **GitHub Actions as a download proxy**: see [GitHub download acceleration and CI caching](/en/posts/github-download-acceleration).)
