---
title: "Multi-Source Segmented Downloads: When More Connections Help (and When They Don't)"
summary: "How much faster is a large download with multiple mirrors and connections? Measured single connection, parallel curl, and aria2 multi-source — plus how to find the real bottleneck."
---

When a big download is slow, don't just "add more connections". There are two completely different causes:

- **Per-connection throttling** (the server/proxy rate-limits each connection) → more connections help;
- **Link saturation** (your pipe is simply maxed out) → more connections don't help.

Confusing the two wastes time. Here's how to tell them apart, with real numbers, and how to use `aria2` for multi-source segmented downloads.

## 1. Find the bottleneck first

The method is simple: **compare single-connection vs. aggregate speed**.

- Aggregate ≈ N × single → per-connection throttling; more connections help.
- Aggregate plateaus → link saturation; more connections won't help.

Measured (same file, 20 MB range, 2026-09):

| Method | Speed | Notes |
| --- | --- | --- |
| Single connection (ghproxy.net) | 1.19 MB/s | per-connection ceiling |
| curl, 6 parallel connections | ~6 MB/s | plateaus at ~6 |
| aria2, 3 mirrors × 8 conn × 2 files | ~6 MB/s | same → **link is saturated** |

Conclusion: this machine's link is ~6 MB/s (~48 Mbps). Multi-connection/multi-source fills the per-connection ceiling and then stops. More connections won't help.

> If your link is 500 Mbps but a single connection only gets 1 MB/s, multi-connection can push it to tens of MB/s — that's where multi-source shines.

## 2. When multi-source segmented download actually helps

- Per-connection throttling by the server/proxy (common with file hosts, some CDNs, GitHub proxies);
- Aggregating **multiple mirrors** with different limits;
- Large files where the server supports **HTTP Range**;
- Resumable downloads (no restart after an interruption).

Counterexamples: a saturated link, or a server without Range support — neither benefits.

## 3. Using aria2

`aria2c` is the standard tool. Key options:

| Option | Meaning |
| --- | --- |
| `-x N` | max connections per server |
| `-s N` | number of segments per file |
| `-k SIZE` | minimum split size (e.g. `1M`) |
| `-j N` | concurrent files |
| `-c` | resume |
| multiple URIs | mirrors for the same file |

**One file, multiple mirrors**:
```bash
aria2c -x 8 -s 8 -k 1M -c \
  "https://mirror-a.example/file.bin" \
  "https://mirror-b.example/file.bin" \
  "https://mirror-c.example/file.bin" \
  -o file.bin
```

**Many files (input file format)** — each entry may list several mirror URIs, then indented options:
```
https://mirror-a.example/file1
https://mirror-b.example/file1
  out=file1
https://mirror-a.example/file2
https://mirror-b.example/file2
  out=file2
```
```bash
aria2c -c -j 2 -x 8 -s 8 -k 1M --file-allocation=none -i dl.aria2
```

`-j 2 -x 8` means 2 files at a time, up to 8 connections each (per mirror).

## 4. Always verify

Third-party mirrors/proxies shouldn't be fully trusted — **verify the hash**:

```bash
sha256sum -c SHA256SUMS
```

aria2 can also verify inline:
```bash
aria2c --checksum=sha-256=<hex> ...
```

## 5. Caveats

- Don't hammer servers: keep connections moderate (8–16) and respect rate limits/ToS.
- Confirm the server supports Range, or segmentation is impossible.
- If the link is saturated, more connections are pointless — measure before tuning.
- This is not a China-specific trick: it applies to **model weights, datasets, CI artifacts, mirror sync**, anywhere.

## Summary

1. Measure: single vs. aggregate to find "throttled" or "saturated".
2. Throttled / multiple mirrors → use `aria2 -x -s` multi-source segments.
3. Saturated → get a faster link, not more connections.
4. Always verify hashes.
