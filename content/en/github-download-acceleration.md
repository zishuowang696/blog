---
title: "GitHub Download Acceleration and CI Caching: From Days to Minutes Behind a Restricted Network"
summary: "Measured GitHub direct vs. China proxies, then used GitHub Actions as a download proxy: fetch all sources on a runner, store them as split Release assets, pull locally and build offline."
---

Building an embedded distribution, the first build is often absurdly slow — and **the bottleneck is almost never compiling, it's downloading**. Upstream sources are scattered across GitHub, kernel.org, SourceForge, huggingface… behind a restricted network, one stuck host can eat a whole day.

This post covers two things: **measure before choosing a route**, and **using GitHub Actions as a download proxy** to fully separate "download" from "compile".

> Case repo: [embedai](https://github.com/zishuowang696/embedai) — a Yocto distro for Jetson Orin Nano, managed with KAS.

## 1. Measure first, don't guess

Mirror/proxy quality changes over time; picking by intuition always backfires. A small script downloads the **same URL** (20 MB) through each source and prints the real speed:

```bash
scripts/speedtest-github.sh [URL] [MB]
```

Measured results (2026-09, single connection, 20 MB):

| Source | Speed | Verdict |
| --- | --- | --- |
| direct `github.com` | timeout / 0 | ❌ unstable |
| `ghproxy.net` | **1.19 MB/s** | ✅ fastest |
| `gh-proxy.com` | 0.69 MB/s | ✅ usable |
| `ghfast.top` | 0.22 MB/s | slow |
| several other well-known proxies | failed | ❌ dead |

Conclusion: **single-connection speed has a ceiling, but it stacks** — 6 parallel connections reach roughly 5–6 MB/s.

## 2. Small files: a proxy prefix is enough

GitHub Release assets can be fetched by prefixing the URL with a proxy:

```bash
curl -L -C - -O "https://ghproxy.net/https://github.com/<owner>/<repo>/releases/download/<tag>/<file>"
```

`-C -` resumes; for many files use `curl -Z --parallel-max 6`. **Always verify with `sha256sum -c`** — third-party proxies shouldn't be fully trusted.

## 3. Big jobs: let GitHub be the download proxy

Yocto pulls **tens of GB across thousands of files**; proxying each one isn't realistic. Change the approach:

> GitHub Actions runners are not affected by the firewall. **Let the runner fetch everything in the cloud, package it, and pull it back locally.**

### Storage choice (the key part)

| Resource | Limit | Suitable? |
| --- | --- | --- |
| **Release assets** | <2 GiB per file, ≤1000 per release, **no total/bandwidth limit** | ✅ |
| Actions cache | **10 GB per repository** | ❌ |
| Actions artifacts | Free plan: 500 MB, expires | ❌ |

So use **Release assets split into parts**: no Actions cache quota, and Actions minutes are free for public repos.

### The workflow

`fetch-cache.yml` does:

1. On the runner: `kas checkout` + `bitbake -k --runall=fetch embedai-image` (download only, no compile)
2. Package `downloads/` into **1.9 GB parts** + `SHA256SUMS`
3. Upload to a Release (tag `dl-cache`, marked prerelease)

Measured: **20.6 GB / 11 parts, ~40 minutes end to end**. For comparison, the same download behind a restricted network can drag on for days.

## 4. Pull locally, build offline

```bash
EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6-way parallel + resume + SHA256 verify + extract into DL_DIR

BB_NO_NETWORK="1" kas build kas.yml
```

`BB_NO_NETWORK=1` forces offline mode — **if a source is still missing it fails immediately**, exposing the exact gap instead of hanging on a slow connection.

## 5. Takeaways

- **Measure first**, then pick a mirror; record the result and date.
- **Separate download from compile**: `--runall=fetch` downloads sources only, resumable and re-runnable.
- **Use Releases for big caches, not Actions cache** (10 GB limit).
- For Yocto sources prefer **bitbake mirrors** (kernel.org via USTC, huggingface via hf-mirror) over proxying GitHub one file at a time.
- Never route sensitive content through third-party proxies, and always verify hashes.

Scripts and docs live in [embedai](https://github.com/zishuowang696/embedai): `scripts/speedtest-github.sh`, `scripts/pull-dl-cache.sh`, `docs/10-github-mirrors.md`.
