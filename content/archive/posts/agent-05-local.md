---
title: "用本地模型跑 Agent（Ollama）"
date: 2026-09-30
tags: [ai-agent, ollama, 边缘]
summary: "Agent 不一定要云模型：本地跑，免费、离线、数据不出场，还能接边缘设备。"
series: "从 0 构建 AI Agent"
published: true
---

Agent 不一定要用云模型。

用 **Ollama** 在本地跑，好处：

- **免费、离线、数据不出场**（隐私）；
- 可以接你的**边缘设备**（Jetson 上也能跑小模型）。

做法：主流 Agent 框架都支持 **Ollama 统一接口**，把 base_url 指到本地即可。

**注意**：小模型的**工具调用能力弱**。
→ 先用能力强的模型把循环跑通，**再换小模型做优化**。

一句话：
> **先跑通，再跑小。**
