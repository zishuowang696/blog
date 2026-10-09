---
title: "Deploy an AI Agent on Jetson Orin: from x86 to the edge"
summary: "Shipping an agent to the edge doesn't change its essence — it's still the loop. Only the runtime and constraints change. Get it running on x86, then move it to Jetson as-is: cloud API or a local llama.cpp, same code."
---

Bottom line: **moving an agent to Jetson doesn't change its essence** — it's still the loop "**ask the model → run the tool → feed the result back**." Only two things change: the **runtime** (aarch64 / CUDA / unified memory) and the **constraints** (compute / power).

So the right approach: **get it running on x86 first, then move it to the device as-is** — the business code usually doesn't change at all.

## Start with an agent

If you haven't read it yet, start with [Building an AI agent from scratch](/en/posts/build-ai-agent-from-scratch): one loop + a `cat` tool, 20 lines. This post deploys it to Jetson.

## Jetson setup (the essentials)

Assuming **Jetson Orin + JetPack 6.x (Ubuntu 22.04, aarch64)**:

```bash
uname -m                 # aarch64
python3 --version        # 3.10
sudo nvpmodel -m 0       # max performance (optional)
tegrastats               # temp / power / memory
```

**Gotcha**: Jetson is **aarch64**, so many pip packages must compile on-device (e.g. `cryptography`). Make sure `pip install` works first.

## Option A: edge execution + cloud brain (get it running)

The agent runs on Jetson, the **model stays in the cloud** (DeepSeek). Fastest path:

```bash
pip install openai
export DEEPSEEK_API_KEY="sk-..."
python agent.py "read /etc/hostname and /proc/meminfo"
```

The edge executes, the cloud thinks. Downside: **needs network**.

## Option B: local model (offline / low latency / privacy)

Run a local LLM on the Jetson with **llama.cpp**, then point the agent at it — llama.cpp exposes an **OpenAI-compatible API**, so the **loop doesn't change**:

```bash
# 1) build (aarch64 + CUDA; Orin compute capability is 8.7)
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=87
cmake --build build --config Release -j

# 2) run a local server (tiny model shown; swap as needed)
./build/bin/llama-server -m models/qwen2.5-1.5b-instruct-q4_k_m.gguf \
    -c 2048 --host 0.0.0.0 --port 8080

# 3) point the agent at it
export LLM_BASE_URL="http://localhost:8080/v1"
export LLM_MODEL="local"
python agent.py "how much memory is left?"
```

**Only `LLM_BASE_URL` changed — not a line of the loop.** That's "swap the model, keep the loop."

> For higher throughput / lower latency, use **TensorRT-LLM** (also OpenAI-compatible) — separate post.

## Run it on boot

Edge devices must "work on power-up". Use systemd:

```bash
sudo cp agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now agent
journalctl -u agent -f      # logs
```

## 5 edge gotchas

1. **Architecture**: aarch64 — verify pip packages build/install first.
2. **CUDA capability**: Orin = **8.7**; `-DCMAKE_CUDA_ARCHITECTURES=87` or nothing runs.
3. **Memory**: unified memory — keep `llama-server -c` modest (top cause of OOM).
4. **Power/thermal**: `nvpmodel` + `tegrastats`; edge runs 24/7.
5. **Autostart & logs**: systemd + `journalctl`, not `nohup`.

## In one line

**The essence of an agent is a loop — ask the model, run the tool, feed it back.** Same on the edge; the value there is **local, offline, low-latency, private** — and that's just a different `LLM_BASE_URL`.

> 📦 Complete runnable code: **[github.com/zishuowang696/agent-on-jetson](https://github.com/zishuowang696/agent-on-jetson)**
>
> 💬 Questions or feedback? **Leave a comment below**, or [open an Issue](https://github.com/zishuowang696/agent-on-jetson/issues) on GitHub.
