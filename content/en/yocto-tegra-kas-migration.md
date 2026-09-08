---
title: "Why I Migrated Our Tegra/Jetson Yocto Distro from git submodules to KAS"
summary: "Using the real embedai repo: why a Yocto project with many upstream layers is better served by declarative KAS than tegra-demo-distro-style submodules — one kas.yml pins versions, config is documentation, and daily work is three commands."
---

Embedded distributions drown in layers: in OpenEmbedded every feature is a separate repo, and assembling a buildable tree means aligning a pile of versions by hand. This post reviews, using the real repo [embedai](https://github.com/zishuowang696/embedai), why I migrated its Tegra/Jetson distribution from **git submodules** to [KAS](https://github.com/siemens/kas).

> Context: `embedai` is a custom Yocto distribution for **Jetson Orin Nano** (`jetson-orin-nano-devkit-nvme`) — `distro: embedai`, image `embedai-image` — built on top of OE4T's `meta-tegra` and the official `tegra-demo-distro` baseline.

## 1. The starting point: tegra-demo-distro's submodule approach

The OE4T-maintained **tegra-demo-distro** manages upstream layers with git submodules: `bitbake`, `openembedded-core`, `meta-openembedded`, `meta-tegra`, `meta-tegra-community`… one submodule per layer. Turning "how do I stitch these git repos into one build tree" into scattered `.gitmodules` entries plus a pile of shell scripts.

The pain grows linearly with the number of repositories:

- Every submodule needs its own `init` / `update`; versions drift on individual pointers, and nobody guarantees "this exact set" is compatible.
- Adding a layer means editing a submodule *and* hand-editing `bblayers.conf` — two error-prone steps.
- Moving machines or entering CI means replaying the whole manual flow.
- "Why this commit?" — the answer lives in history, not in configuration.

## 2. Migration: one kas.yml replaces all the manual work

KAS is "config-as-build": one `kas.yml` declares **which repos to fetch, which commit to pin, which layers to enable and their priority**, plus `machine` / `distro` / `target`. The tool turns the declared state into a buildable tree. After the migration, the entire "multi-repo + layers + build targets" story lives at the top of `kas.yml`:

```yaml
header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:         { prio: 85 }
      meta-python:     { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai
```

> `header.version` matches the KAS config version of your installed tool; the `22` above is just an example. Always follow the [KAS docs](https://kas.readthedocs.io) and the actual `kas.yml` in the repo.

### Comparison

| Dimension | tegra-demo-distro (git submodules) | This repo (KAS) |
|------|-----------------------------------|-----------------|
| Multi-repo management | one submodule per layer, manual `init/update`, hand-aligned versions | one `kas.yml` declares repos + layers; `kas checkout` does it all |
| Version consistency | depends on drifting submodule pointers | every repo pinned to a **commit** — a reproducible snapshot |
| Swap / add layers | edit submodules + `bblayers.conf`, error-prone | a few lines in `repos:` / `layers:` |
| Build entry point | memorize a chain of bitbake/env commands | `kas build` / `kas shell` / `kas dump`; config is documentation |
| Trim-ability | stack patches on top of the official distro | distro/image/layers live in your own `meta-embedai`, easy to cut |
| CI / automation | fragile scripts | kas commands drop straight into GitHub Actions |

## 3. Daily work is really just three commands

```
kas checkout   # pull all layers to their pinned commits
kas build      # build the target image (embedai-image)
kas shell      # open a bitbake shell for fine-grained work
```

Handy when debugging:

```
kas dump       # print the fully-resolved configuration (effective machine/distro/layers)
```

`kas build` internally handles the whole “init ritual” — generating `bblayers.conf` via `bitbake-layers` and injecting `machine`/`distro`. The payoff: **configuration is the documentation**. Anyone who clones the repo can reproduce a build without holding a sequence of steps in their head.

## 4. meta-embedai: keep your own changes in one place

All of `embedai`'s customizations live in the self-contained `meta-embedai` layer:

```text
meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # custom distro: embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A compatibility tweaks
└── recipes-core/               # image recipes (embedai-image), etc.
```

The benefit is a clean boundary: upstream layers stay pristine, and every override (distro definition, image contents, BSP patches) lives in your layer. Dropping something you don't need only touches one place.

## 5. Reproducibility is the most valuable property of a distro

Every upstream repo is pinned to a full commit in `kas.yml`, so:

- different machines, fresh environments, and CI all produce the same result;
- when something breaks you can answer precisely “which commit introduced it”;
- upgrading an upstream is a one-line commit change, rebuilt and verified with visible risk.

## 6. Adding a layer? Search first, then declare

Want to integrate OpenWrt-related (or any OE) content later? The flow is fixed: search for a suitable layer at <https://layers.openembedded.org> → add the repo under `repos:` and declare path + priority under `layers:` in `kas.yml` → `kas checkout && kas build`. No more touching `bblayers.conf`.

## Links

- **embedai** (this repo: full `kas.yml` + `meta-embedai/`): <https://github.com/zishuowang696/embedai>
- **KAS** (config/build tool): <https://github.com/siemens/kas> · docs <https://kas.readthedocs.io>
- **tegra-demo-distro** (the submodule approach this project started from): <https://github.com/OE4T/tegra-demo-distro>
- **meta-tegra** (Jetson BSP layer): <https://github.com/OE4T/meta-tegra>
- **meta-tegra-community**: <https://github.com/OE4T/meta-tegra-community>
- **OpenEmbedded Core / bitbake**: <https://github.com/openembedded/openembedded-core>
- **meta-openembedded** (meta-oe etc.): <https://github.com/openembedded/meta-openembedded>
- **meta-virtualization**: <https://git.yoctoproject.org/meta-virtualization>

> Note: before pulling in OpenWrt-flavored layers, search <https://layers.openembedded.org> first, then declare them in `kas.yml`.
