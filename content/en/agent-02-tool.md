---
title: "Giving the model hands: tool calling"
summary: "A model can talk, not act. Tool calling gives it hands — but your code does the work."
---

A model can talk, not act.

**Tool calling (function calling)** gives it hands:

- You describe **which functions exist and their parameters**;
- The model picks **which one and with what arguments**;
- Your program **actually executes it** and returns the result.

Key point: **the model runs nothing**. It only emits "call `get_temp()`". **Your code always does the work** — which is exactly where agent safety lives (you can intercept and audit).

So don't hoard tools. **Start with three you truly need.**
