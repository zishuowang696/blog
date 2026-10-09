---
title: "把 AI Agent 部署到 Jetson Orin：从 x86 到边缘"
date: 2026-10-10
tags: [jetson, ai-agent, 边缘ai, 部署, 教程]
summary: "部署到边缘，Agent 的本质没变——还是那个循环。变的只是运行环境和性能约束。先在 x86 跑通，再原样搬到 Jetson：接云端 API 或跑本地 llama.cpp，同一套代码。"
series: "从 0 构建 AI Agent"
published: false
---

先说结论：**把 Agent 搬到 Jetson，本质没变**——还是那个循环"**调用 API 问模型 → 执行工具 → 回喂结果**"。变的只有两样东西：**运行环境**（aarch64 / CUDA / 统一内存）和**性能约束**（算力 / 功耗）。

所以正确姿势是：**先在 x86 上跑通，再把它原样搬到设备上**——业务代码通常一行都不用改。

## 先有一个 Agent

如果你还没看过，先读[《从 0 构建一个 AI Agent》](/posts/build-ai-agent-from-scratch)：一个循环 + 一个 `cat` 工具，20 行。本文就在它基础上部署到 Jetson。

## Jetson 环境准备（要点）

以 **Jetson Orin + JetPack 6.x（Ubuntu 22.04, aarch64）** 为例：

```bash
# 确认平台
uname -m                 # aarch64
python3 --version        # 3.10
sudo nvpmodel -m 0       # 满血模式（按需）
tegrastats               # 看温度 / 功耗 / 内存
```

**关键坑**：Jetson 是 **aarch64**，很多 pip 包要能在设备上编译（如 `cryptography`）；先确认 `pip install` 能过。

## 跑法 A：边缘执行 + 云端大脑（先跑通）

Agent 跑在 Jetson 上，**模型仍在云端**（DeepSeek）。这是最快跑通的方式：

```bash
pip install openai
export DEEPSEEK_API_KEY="sk-..."
python agent.py "看一下 /etc/hostname 和 /proc/meminfo"
```

适合"边缘负责执行、云端负责思考"。缺点：**依赖网络**。

## 跑法 B：本地模型（离线 / 低延迟 / 隐私）

用 **llama.cpp** 在 Jetson 上跑本地 LLM，再让 Agent 指过去——因为 llama.cpp 提供 **OpenAI 兼容接口**，**循环零改动**：

```bash
# 1) 编译（aarch64 + CUDA；Orin 算力 8.7）
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=87
cmake --build build --config Release -j

# 2) 起本地服务（小模型示例，按需换）
./build/bin/llama-server -m models/qwen2.5-1.5b-instruct-q4_k_m.gguf \
    -c 2048 --host 0.0.0.0 --port 8080

# 3) 让 Agent 指过去
export LLM_BASE_URL="http://localhost:8080/v1"
export LLM_MODEL="local"
python agent.py "看一下 /proc/meminfo 还剩多少内存"
```

**只有 `LLM_BASE_URL` 变了，Agent 循环一个字没动**——这就是"模型可换、循环不变"。

> 想要更高吞吐/更低延迟，可上 **TensorRT-LLM**（同样是 OpenAI 兼容层），另开一篇讲。

## 让它开机自启

边缘设备要"上电即用"，用 systemd 托管：

```bash
sudo cp agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now agent
journalctl -u agent -f      # 看日志
```

## 部署到边缘的 5 个坑

1. **架构**：aarch64，pip 包能否装/编，先验证；
2. **CUDA 算力**：Orin = **8.7**，`-DCMAKE_CUDA_ARCHITECTURES=87` 写错就白编；
3. **内存**：统一内存，`llama-server -c` 上下文别开太大（OOM 头号原因）；
4. **功耗/散热**：`nvpmodel` + `tegrastats`，边缘常年 7×24；
5. **自启与日志**：systemd + `journalctl`，别靠手动 `nohup`。

## 一句话收尾

**Agent 的本质是一个循环——问模型、执行工具、回喂结果。** 到边缘也一样；边缘的价值在于**本地、离线、低延迟、隐私**，而这只是换了 `LLM_BASE_URL`。

> 📦 完整可运行代码：**[github.com/zishuowang696/agent-on-jetson](https://github.com/zishuowang696/agent-on-jetson)**
>
> 💬 有问题或建议？**在下方评论**，或到 GitHub [提 Issue](https://github.com/zishuowang696/agent-on-jetson/issues)。

*（本文中英双语；本系列记录从 0 构建 Agent 的过程。）*
