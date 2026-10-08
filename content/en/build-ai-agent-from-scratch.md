---
title: "Building an AI agent from scratch (complete)"
summary: "The think→act→observe loop, tool calling, memory, observability, local models, and a few-dozen-line rebuild — merged into one read."
---

Many people think AI agents are complicated. In reality there's **one loop**, and everything else is engineering around it.

## 1. The core: a loop

1. Give the model the **question** and current context;
2. It either **answers**, or **calls a tool**;
3. Run the tool → **feed the result back**;
4. **Repeat** until it answers.

That's it. Frameworks mostly just make this loop nicer. The fastest way to get it is to **write it yourself** — the core is a few dozen lines.

## 2. Giving the model hands: tool calling

A model can talk, not act. **Tool calling** gives it hands: you describe the functions and their parameters; the model picks **which one and with what arguments**; **your code actually runs it** and returns the result.

The model runs nothing — it only emits "call `get_temp()`". **Your code always does the work**, which is where safety lives. Start with three genuinely useful tools.

## 3. Memory: short vs long term

Models have no memory — every call is a stranger. Memory is whatever you feed back. **Short-term**: append history (simple, grows). **Long-term**: store key facts in a vector store and retrieve them (cheaper, scales). Start short; add long when needed. **Memory isn't "storing" — it's "retrieving next time."**

## 4. Why observability matters

Agents are non-deterministic. If you can't see each step — each model decision, each tool call with its arguments and result, where time goes — you can't debug. **Debugging an agent is reading its trace.**

## 5. Running on a local model (Ollama)

Agents don't need the cloud. With Ollama: **free, offline, private**, and it fits **edge devices** (small models on a Jetson). Point the base URL at localhost. Caveat: small models are **weak at tool calling** — **get the loop working on a strong model first, then size down**.

## 6. Rebuild it in a few dozen lines

A minimal agent needs three things: a **loop** until an answer; a few **tools** (plain functions with parameter docs); and **execution** that feeds results back. A few dozen lines is enough. Then you'll see frameworks aren't magic — **you own the core.**

Next: give it your own tool — like **reading a device's temperature** — and you've started a self-maintaining device agent.

---

**Summary**: an agent = **loop** + **tools** (the model decides, your code executes) + **memory** + **observability**, run on a **local model** for an **offline, private, edge-ready** assistant.
