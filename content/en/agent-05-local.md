---
title: "Running agents on a local model (Ollama)"
summary: "Agents don't need the cloud: run locally for free, offline, private — and on edge devices."
---

Agents don't need cloud models.

Run them locally with **Ollama**:

- **free, offline, private** (data never leaves);
- can run on your **edge devices** (small models fit a Jetson).

How: most agent frameworks speak **Ollama's unified API** — just point the base URL at localhost.

**Caveat**: small models are **weak at tool calling**.
→ Get the loop working on a strong model first, **then size down to optimize**.

One line:
> **First make it work, then make it small.**
