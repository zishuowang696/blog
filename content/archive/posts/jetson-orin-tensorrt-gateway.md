---
title: "Jetson Orin 上跑容器化 TensorRT：从交叉编译到刷机落地"
date: 2026-08-15
tags: [jetson, tegra, ai网关]
summary: "在 NVIDIA Jetson Orin 上用 JetPack 容器做 TensorRT 推理并部署为边缘 AI 网关服务的完整路径，含 jetson-flash 刷机要点。"
series: "AI 网关实战"
published: true
---

NVIDIA Tegra 平台的“嵌入式”和路由器不同：它的亮点是板载 GPU，适合把模型推理下沉到边缘。这篇讲清楚从拿到 Orin 到跑通第一个 TensorRT 程序的三个层次。

> 假设：Jetson Orin Nano 8GB，宿主机 Ubuntu 22.04 x86_64，目标 JetPack 6.0（L4T r36.x）。

## 0. 三个层次先分清

- **BSP / JetPack**：系统 + 驱动 + CUDA/TensorRT，本质还是 Yocto 风格的 L4T 发行版。
- **容器化**：JetPack 提供 `nvcr.io/nvidia/l4t-*` 镜像，避免污染 host。
- **交叉编译**：x86 宿主编译 `aarch64` 目标程序，再拷到板子。

## 1. 刷机：使用 SDK Manager 或命令行

命令行刷写镜像（需要先 `download` JetPack 压缩包）：

```bash
export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit
```

要点：

- USB 线连 Orin 的 **Type-C 恢复口**，按住 Recovery 键上电进入刷机模式。
- 刷机前备份：`$L4T_DIR/bootloader/system.img` 不可直接复制，用 `nvbackup` 做整机备份。

## 2. 部署：把推理服务容器化

在板子上使用官方容器：

```bash
# 需要注册 NVIDIA NGC，获得 nvcr.io 凭据
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt
```

## 3. 暴露给局域网：边缘 AI 网关雏形

板子上跑一个转发/推理代理（Python + FastAPI 亦可），关键点是**用共享内存或本地 socket 转发 RTSP/HTTP 帧**：

```bash
# 简化的“帧 → TensorRT → 结果”pipeline 骨架
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink
```

完整网关会再叠加 OpenWrt 一侧的 NAT/带宽管理，见系列后续文章。

## 小结

| 环节 | 工具 | 用途 |
| --- | --- | --- |
| 刷系统 | jetson-flash / SDK Manager | L4T + 驱动 |
| 推理 | l4t-tensorrt 容器 | 不污染 host |
| 部署 | Docker + systemd | 边缘常驻服务 |
