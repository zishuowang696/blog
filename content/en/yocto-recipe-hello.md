---
title: "Your First BitBake Recipe: Hello World in a meta- Layer"
summary: "Create a custom layer and a minimal recipe step by step, install your compiled program into a QEMU image, and learn SRC_URI / S / do_compile."
---

Yocto uses a **recipe** (`.bb`) to describe "how source code becomes an installable package". This post walks the full path with a minimal example: build a layer → write a recipe → compile → land in an image.

> Assumptions: `poky` is cloned into `~/poky` on branch `kirkstone` (LTS). Host: Ubuntu 22.04.

## 1. Structure: start with a layer

```bash
cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer
```

The generated `meta-mylayer` already ships an example `recipes-example/example/example_0.1.bb`. A real layer looks like this:

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

## 2. A plain C recipe

`myhello.c` is omitted here (it prints `hello from yocto`). The recipe:

```bitbake
SUMMARY = "Minimal hello program"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=... "

SRC_URI = "file://myhello.c"
S = "${WORKDIR}/sources"
UNPACKDIR = "${S}"   # unpack directory since kirkstone

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig
```

## 3. Build a single recipe

```bash
bitbake myhello
```

The result is under:

```bash
find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello
```

## 4. Put it into an image and run it in QEMU

```bash
# Append to the image of the local target machine
echo 'IMAGE_INSTALL:append = " myhello"' >> conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64
```

Once booted:

```bash
root@qemux86-64:~# myhello
hello from yocto
```

## Common pitfalls

- Source changes not picked up: check for stale `do_compile` caches, use `bitbake -c cleansstate myhello` when needed.
- `md5=` checksum: compute the real hash with `sha256sum` and replace it.
- Debugging variables: `bitbake -e myhello | grep ^S=`.

Next up: layer priorities and overriding an official recipe with a `.bbappend`.
