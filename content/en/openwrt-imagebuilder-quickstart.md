---
title: "OpenWrt ImageBuilder: Custom Firmware in a Few Commands"
summary: "Add packages and repack an official firmware image with the OpenWrt ImageBuilder in minutes, without compiling the whole source tree."
---

The most common question when starting with OpenWrt is: "I don't want to build the entire source tree just to add a couple of packages." The official **ImageBuilder** exists exactly for that: it only repackages, it does not recompile the kernel.

> Assumptions: host Ubuntu 22.04 / Debian 12, target **x86_64**, OpenWrt **23.05.5**.

## 1. Download the ImageBuilder for your target

```bash
cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64
```

## 2. Inspect the available packages

The ImageBuilder ships a `packages` index, so you can simply `grep`:

```bash
make info | grep -i luci
# common: luci luci-ssl-openssl luci-app-* etc.
```

Note: the ImageBuilder only includes packages that are in sync with the official feeds. To add a self-compiled `.ipk`, drop it into the `packages/` directory before running `make`.

## 3. Build a firmware with extra packages

```bash
make image \
  PROFILE=generic \
  PACKAGES="luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs"
```

The resulting image lives under `bin/targets/x86/64/`:

```text
openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz
```

Before flashing, remember:

```bash
gzip -dk openwrt-*.img.gz
# For x86 you can validate with qemu or a disk writer (dd / balenaEtcher)
```

## 4. Getting your own package onto the image

Self-compiled `.ipk` files can be installed with `opkg`, no repackaging needed:

```bash
scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "opkg install /tmp/mypackage_1.0_1_x86_64.ipk"
```

## Wrap-up

| Scenario | Recommended tool |
| --- | --- |
| Only official packages, fast repack | ImageBuilder |
| Deep kernel/driver customization | Source build (SDK) |
| Everyday package management | opkg online install |

Next up: trimming the kernel with `menuconfig` when building from source.
