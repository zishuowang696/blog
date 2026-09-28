---
title: "Why a Jetson Image Build Silently Compiles Rust and LLVM"
summary: "A build kept stalling on llvm-native and rust-native. Tracing reverse dependencies with bitbake -g led to Tegra's OP-TEE / EKS boot chain needing python3-cryptography — which is written in Rust."
---

While maintaining a Jetson distro (`embedai`), the slowest parts of CI were never my apps or the kernel. They were two things I never asked for: **`llvm-native` and `rust-native`**.

This is a write-up of the investigation: **from "why is LLVM in my build log?" all the way back to Tegra's boot chain.**

## 1. Symptom

The build log kept showing:

```
active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install
```

A "headless, AI-only" image that compiles the LLVM and Rust toolchains from source — hours of work I did not ask for.

## 2. Method: trace reverse dependencies

Don't guess. Use bitbake's own dependency graph:

```bash
kas shell kas.yml -c "bitbake -g embedai-image"
# generates pn-buildlist and task-depends.dot
```

Then look for **who depends on it**. For every edge `"A" -> "B"` (A depends on B), collect the recipes that point at `llvm-native` / `rust-native`, ignoring intra-recipe edges.

Measured chain:

```
tegra-bootfiles
  -> tegra-eks-image            (NVIDIA EKS key-store image)
    -> optee-nvsamples-native
      -> python3-cryptography-native
        -> python3-maturin-native / setuptools-rust-native
          -> rust-native + cargo-native
            -> llvm-native
```

## 3. Why

- **`python3-cryptography` has been Rust-based since v42.** It's a Python package, but its crypto primitives are implemented in Rust, so building it requires `cargo` (via `maturin` / `setuptools-rust`).
- **Rust's compiler backend *is* LLVM**, so building `rust-native` drags in `llvm-native`.
- In short: **to build one Python crypto library, the build first compiles the Rust compiler, then LLVM.**

## 4. Root cause: Tegra's boot chain

`meta-tegra/recipes-security/optee/optee-l4t.inc` contains:

```bitbake
DEPENDS = "python3-pyelftools-native python3-cryptography-native"
```

`optee-nvsamples-native` inherits it; it's a dependency of **`tegra-eks-image`** (the EKS key-store image), which is part of the **boot firmware** (`tegra-bootfiles`).

So: **Tegra's secure-boot infrastructure needs Python's cryptography to sign / handle keys → Rust → LLVM.**

## 5. A switch, and its limits

meta-tegra offers a flag to use NVIDIA's prebuilt OP-TEE instead of building from source:

```conf
USE_PREBUILT_OPTEE = "1"
```

Effect: **`tos-optee` becomes `tos-prebuilt`, and `optee-os` disappears from the graph** — one big recipe gone.

But the Rust/LLVM chain **stays**, because `cryptography` comes in via the **EKS branch** (`optee-nvsamples-native`), not `optee-os`. **Cut one layer, find another.**

## 6. A red herring: it is not OpenGL

I suspected the distro's `opengl` feature (an oe-core default) pulling `mesa → clang/llvm`. The graph proved otherwise: **`mesa` is not in the Jetson build at all** (it belongs to the QEMU config). — **Read the graph, don't guess.** That saved a pointless large change.

## 7. Takeaways

- **Heavy natives (LLVM / Rust / Clang) are almost always pulled in by some package's dependency or optional feature**, not by core requirements.
- **How to find it**: `bitbake -g`, then walk `task-depends.dot` **upstream**, one layer at a time.
- **The cost is one-time**: once `sstate` is populated, neither local nor CI rebuilds it again — which is exactly why **filling the sstate cache matters**.

> Next time your Yocto build mysteriously stalls on `llvm-native`, don't blame the hardware — follow the dependency graph and ask: **who dragged it in?** The answer is often in a corner you'd never expect (this time: OP-TEE's key-store image).
