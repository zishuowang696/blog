---
title: "Containerized TensorRT on Jetson Orin: From Cross-Compile to Flashing"
summary: "Run TensorRT inference in JetPack containers on NVIDIA Jetson Orin and deploy it as an edge AI gateway, including jetson-flash essentials."
---

The "embedded" story of NVIDIA's Tegra platform is different from routers: the highlight is the on-board GPU, which makes it great for pushing model inference to the edge. This post clarifies the three layers from unboxing an Orin to running your first TensorRT program.

> Assumptions: Jetson Orin Nano 8 GB, host Ubuntu 22.04 x86_64, target JetPack 6.0 (L4T r36.x).

## 0. Three layers, clearly separated

- **BSP / JetPack**: system + drivers + CUDA/TensorRT — essentially a Yocto-style L4T distro.
- **Containers**: JetPack ships `nvcr.io/nvidia/l4t-*` images so you don't pollute the host.
- **Cross-compilation**: build `aarch64` binaries on your x86 host, then copy them to the board.

## 1. Flashing: SDK Manager or the command line

Flashing from the CLI (download the JetPack archive first):

```bash
export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit
```

Key points:

- Connect a USB cable to the Orin **Type-C recovery port**; hold Recovery and power on to enter flash mode.
- Back up before flashing: `$L4T_DIR/bootloader/system.img` must not be copied directly — use `nvbackup` for a full backup.

## 2. Deployment: containerize the inference service

On the board, use the official containers:

```bash
# You need an NVIDIA NGC account for nvcr.io credentials
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt
```

## 3. Exposing it to the LAN: an edge AI gateway prototype

Run a forwarding/inference agent on the board (Python + FastAPI works too). The key idea is to forward RTSP/HTTP frames over **shared memory or a local socket**:

```bash
# Simplified "frame → TensorRT → result" pipeline skeleton
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink
```

A full gateway layers OpenWrt-side NAT/bandwidth management on top; see the rest of the series.

## Wrap-up

| Step | Tool | Purpose |
| --- | --- | --- |
| Flash the system | jetson-flash / SDK Manager | L4T + drivers |
| Inference | l4t-tensorrt container | keeps the host clean |
| Deployment | Docker + systemd | always-on edge service |
