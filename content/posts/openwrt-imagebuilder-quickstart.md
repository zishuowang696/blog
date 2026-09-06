---
title: "OpenWrt ImageBuilder 快速定制固件：只需几条命令"
date: 2026-07-10
tags: [openwrt, 固件编译]
summary: "用官方 ImageBuilder 给 x86/路由器目标添加软件包并重新打包固件，几分钟内得到可刷写镜像。"
series: "OpenWrt 编译入门"
published: true
---

入门 OpenWrt 定制最常见的一个问题是：不想从零编译整个源码树，只想给官方固件加几个包。官方 **ImageBuilder** 就是为此准备的：它只做“打包”，不重新编译内核。

> 假设：主机为 Ubuntu 22.04 / Debian 12，目标设备 **x86_64**，OpenWrt 版本 **23.05.5**。

## 1. 下载对应目标平台的 ImageBuilder

```bash
cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64
```

## 2. 查看可用的软件包

ImageBuilder 随附 `packages` 索引，可直接 `grep`：

```bash
make info | grep -i luci
# 常见：luci luci-ssl-openssl luci-app-* 等
```

注意：ImageBuilder 只包含与官方源同步的包。若想加入自定义编译的 `.ipk`，可放到 `packages/` 目录后再执行 `make`。

## 3. 生成带额外软件包的固件

```bash
make image \
  PROFILE=generic \
  PACKAGES="luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs"
```

得到的镜像位于 `bin/targets/x86/64/`：

```text
openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz
```

刷写前记得：

```bash
gzip -dk openwrt-*.img.gz
# x86 目标可先用 qemu 或写盘工具（dd / balenaEtcher）验证
```

## 4. 把自定义包塞进镜像

自编译的 `.ipk` 通过 `opkg` 安装即可，无需重打包：

```bash
scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "opkg install /tmp/mypackage_1.0_1_x86_64.ipk"
```

## 小结

| 场景 | 推荐工具 |
| --- | --- |
| 只加官方包、快速打包 | ImageBuilder |
| 深度定制内核/驱动 | 源码编译（SDK） |
| 日常装软件 | opkg 在线安装 |

下一篇会讲源码编译时如何用 `menuconfig` 裁剪内核。
