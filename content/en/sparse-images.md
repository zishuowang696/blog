---
title: "Sparse images: why your 14GB image is really 1GB"
summary: "Yocto ext4 images can be tens of GB yet fail to upload because of a 2GiB per-file limit — because most of the file is holes. How to detect sparse files, compress them, and ship them the right way."
---

If you build embedded images, you have probably seen this: the build produces a **14GB `.ext4`**, but uploading it hits a **2GiB per-file limit** — and you know full well there isn't that much *stuff* inside.

That's a **sparse file**: **large logical size, small physical footprint**. Here's how to **detect**, **compress**, and **ship** it.

## 1. What a sparse file is

A sparse file contains "holes": regions that are logically large but allocate **no real disk blocks** because they're all zeros.

The key is to separate two numbers — **logical size ≠ physical usage**:

| Tool | What it shows |
| --- | --- |
| `ls -l` / `stat -c %s` | **Logical** size (holes included, e.g. 14GB) |
| `du` / `stat -c %b` | **Physical** usage (actually allocated blocks, maybe a few hundred MB) |

## 2. Why Yocto images are so sparse

A Yocto `ext4` image is **pre-allocated** to a target **`ROOTFS_SIZE`** and then filled with the actual content — everything not written is a hole. So you get a "14GB" file whose real data is a few hundred MB; the rest is zeros.

Relevant variables: `IMAGE_ROOTFS_SIZE`, `IMAGE_OVERHEAD_FACTOR`, `IMAGE_ROOTFS_EXTRA_SPACE`.

## 3. How to detect it

```bash
ls -lh img.ext4          # logical size (14G)
du  -h img.ext4          # physical usage (a few hundred M => sparse)
stat -c 'size=%s  blocks=%b' img.ext4   # physical = %b * 512 bytes
filefrag -v img.ext4     # list extents / holes per segment
```

**Rule of thumb**: if `du` (physical) is **much smaller** than `ls` (logical), it's sparse.

The professional route is `bmaptool`: it produces a **block map (`.bmap`) of the non-empty blocks**, useful both for detection and for fast "write only non-empty blocks" flashing.

## 4. How to compress it

**Approach 1: just compress (simple, slow)**

```bash
zstd img.ext4
```

Zeros compress extremely well, so 14GB can shrink to ~1GB — but the compressor must **read all 14GB of zeros**.

**Approach 2: sparse-aware (recommended)**

```bash
tar --sparse -cf - img.ext4 | zstd   # tar skips holes, then compress -> fast
zstd --sparse img.ext4
cp --sparse=always a b               # preserve sparseness when copying
rsync -S a b
```

**Approach 3: the pro tool for flashing: `bmaptool`**

```bash
bmaptool create img.ext4 -o img.ext4.bmap
bmaptool copy   img.ext4 /dev/sdX    # writes only non-empty blocks (fast, verifiable)
```

## 5. How to ship it

1. **Don't ship the raw sparse ext4** — it's big, mostly empty, and hits the 2GiB limit;
2. Ship **compressed artifacts**: `*.tegraflash.tar.zst` (the real flashing bundle), `ext4.zst` / `ext4.gz`, plus a `.bmap`;
3. **If you must ship the raw image**: `zstd` it first — likely under 2GiB, **no splitting needed**;
4. Splitting is a last resort (cutting a 14GB raw ext4 into 8 parts is just wasteful).

In our Jetson distro, `meta-tegra` already emits `tegraflash-tar.zst` (a ~1.3GB compressed flashing bundle); the only "fat" artifact is the raw `.ext4` — so we simply **skip it when publishing**.

## 6. TL;DR

**A sparse image is "big logically, small physically":**

- **Detect**: `du` (physical) vs `ls`/`stat` (logical), or `filefrag -v` / `bmaptool create`;
- **Compress**: `zstd` is easiest, `tar --sparse` / `zstd --sparse` are faster, `bmaptool` is the pro option;
- **Ship**: **only compressed artifacts + `.bmap`** — never the raw sparse `.ext4`.
