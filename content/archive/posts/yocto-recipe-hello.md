---
title: "Yocto 第一个 BitBake recipe：meta- 层里的 Hello World"
date: 2026-08-01
tags: [yocto, bitbake]
summary: "手把手创建自定义 layer 与最小 recipe，并在 QEMU 镜像里安装自己编译的程序，理解 SRC_URI / S / do_compile。"
series: "Yocto 构建系统笔记"
published: true
---

Yocto 用 **recipe**（`.bb`）描述“怎么把一个源码变成安装包”。这篇用一个最小示例走通整条链路：自建 layer → recipe → 编译 → 进入镜像。

> 假设：`poky` 已 `git clone` 到 `~/poky`，分支 `kirkstone`（LTS）。主机 Ubuntu 22.04。

## 1. 结构：先有 layer

```bash
cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer
```

生成的 `meta-mylayer` 自带一个示例 `recipes-example/example/example_0.1.bb`。真正的 layer 长这样：

```text
meta-mylayer/
├── conf/layer.conf
└── recipes-example/
    ├── example/example_0.1.bb
    └── myhello/
        ├── myhello_0.1.bb
        └── files/
            └── myhello.c
```

## 2. 一个普通 C 程序 recipe

`myhello.c` 内容略（打印 `hello from yocto`）。recipe：

```bitbake
SUMMARY = "Minimal hello program"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=... "

SRC_URI = "file://myhello.c"
S = "${WORKDIR}/sources"
UNPACKDIR = "${S}"   # kirkstone 后解包目录

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig
```

## 3. 只编译单个 recipe

```bash
bitbake myhello
```

产物在：

```bash
find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello
```

## 4. 塞进镜像并在 QEMU 里运行

```bash
# 加入本地目标机器的镜像
echo 'IMAGE_INSTALL:append = " myhello"' >> conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64
```

进入系统后：

```bash
root@qemux86-64:~# myhello
hello from yocto
```

## 常见坑

- 改了源码没生效：检查 `do_compile` 是否有旧缓存，必要时 `bitbake -c cleansstate myhello`。
- `md5=` 校验和：用 `sha256sum` 得到文件哈希后替换。
- 需要调试变量：`bitbake -e myhello | grep ^S=`。

下一篇介绍 layer 优先级与 `.bbappend` 覆盖官方 recipe。
