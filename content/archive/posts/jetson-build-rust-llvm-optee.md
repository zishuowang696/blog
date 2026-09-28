---
title: "为什么编个 Jetson 镜像，Yocto 会顺手编出 Rust 和 LLVM？"
date: 2026-09-28
tags: [yocto, jetson, optee, rust, llvm, 构建提速]
summary: "一次构建长时间卡在 llvm-native / rust-native。用 bitbake -g 反向追依赖，根因是 Tegra 启动链里的 OP-TEE / EKS 需要 python3-cryptography，而它现在是 Rust 写的。"
series: "AI 网关实战"
published: true
---

在维护 Jetson 发行版（`embedai`）时，CI 里最慢的从来不是我的应用，也不是内核，而是两个我"根本没用到"的东西：**`llvm-native` 和 `rust-native`**。

这篇文章记录一次完整的排查：**从"日志里突然冒出 LLVM"，一路逆推到 Tegra 的启动链。**

## 1. 现象

构建日志里反复出现：

```
active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install
```

一个"无 GUI、只跑 AI"的镜像，为什么要编 LLVM 和 Rust 编译器？而且它们**动辄数小时**。

## 2. 方法：用依赖图逆查

不要猜，用 bitbake 自己的依赖图：

```bash
kas shell kas.yml -c "bitbake -g embedai-image"
# 生成 pn-buildlist（包清单）与 task-depends.dot（任务依赖图）
```

然后在 `task-depends.dot` 里**反向找"谁依赖它"**：对每条 `"A" -> "B"`（A 依赖 B），统计所有指向 `llvm-native`、`rust-native` 的边，并剥掉同 recipe 的内部依赖。

结果（本机实测）：

```
llvm-native            <- rust-native
rust-native            <- python3-cryptography-native, python3-maturin-native
python3-maturin-native <- python3-cryptography-native
python3-cryptography-native <- optee-nvsamples-native
optee-nvsamples-native <- tegra-eks-image
tegra-eks-image        <- tegra-bootfiles
```

链条一路清晰：

```
tegra-bootfiles            （启动固件打包）
  → tegra-eks-image        （NVIDIA EKS 加密密钥库镜像）
    → optee-nvsamples-native
      → python3-cryptography-native   ← 关键
        → python3-maturin-native / setuptools-rust-native
          → rust-native + cargo-native
            → llvm-native
```

## 3. 为什么会这样

- **`python3-cryptography` 从 42 版起是 Rust 写的**。它是一个 Python 包，但内部用 Rust 实现密码学原语，构建时要 `cargo`（`maturin` / `setuptools-rust` 负责编）。
- **Rust 编译器的后端就是 LLVM**（`rustc` 借 LLVM 做代码生成）——所以在 Yocto 里编 `rust-native`，会顺带编 `llvm-native`。
- 一句话：**为了编一个 Python 的密码学库，构建被迫先编出 Rust 编译器，再编出 LLVM。**

## 4. 根在 Tegra 的启动链

`meta-tegra/recipes-security/optee/optee-l4t.inc` 里有一行：

```bitbake
DEPENDS = "python3-pyelftools-native python3-cryptography-native"
```

而 `optee-nvsamples-native` 继承了这个 inc；它又是 **`tegra-eks-image`（EKS 密钥库镜像）**的依赖，EKS 则是**启动固件**（`tegra-bootfiles`）的一环。

所以：**Tegra 的安全启动基础设施要用 Python 的 cryptography 来签名/处理密钥 → Rust → LLVM。**

## 5. 试过的开关（以及它的边界）

meta-tegra 提供了一个开关，让 OP-TEE 用 NVIDIA 预编译而不是从源码编：

```conf
USE_PREBUILT_OPTEE = "1"
```

效果：**`tos-optee` 换成 `tos-prebuilt`，`optee-os` 从依赖图里消失**——省掉一个大件。

但**Rust/LLVM 仍在**：因为 `cryptography` 走的是 **EKS 那条支线**（`optee-nvsamples-native`），**不是** `optee-os`。**砍掉一层，还有一层。**

## 6. 顺带辟谣：不是 OpenGL

一度怀疑是发行版带 `opengl`（oe-core 默认特性）拉了 `mesa → clang/llvm`。但依赖图证明：**`mesa` 根本不在 Jetson 的构建图里**（它属于 qemu 配置那套）。——**先查图，别靠猜**，这条省了我们一次错误的大改。

## 7. 结论

- **重型 native（LLVM / Rust / Clang）几乎都是被某个包的依赖或可选特性"顺手"拉进来的**，不是核心必需；
- **定位手段**：`bitbake -g` + 在 `task-depends.dot` 里**反向找上游**，一层层剥；
- **代价是一次性的**：sstate 缓存命中后，后续与 CI 都不会再编——这也是"**必须把 sstate 攒满**"的真正意义。

> 下次你的 Yocto 构建莫名卡在 `llvm-native`，别急着怪硬件——先顺着依赖图问一句：**是谁把它拉进来的？** 答案往往在一个你没想到的角落（这次是：OP-TEE 的密钥库镜像）。
