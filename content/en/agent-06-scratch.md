---
title: "Rebuild it from scratch: an agent in a few dozen lines"
summary: "The best validation after reading a framework is writing your own — a minimal agent needs only three things."
---

After reading a framework, the best validation is to **write one yourself**.

A minimal agent needs only three things:

1. A **loop** — `while`, until you get an answer;
2. **Tools** — a few plain functions with names and parameter docs;
3. **Execution** — actually run the requested function and feed the result back.

**A few dozen lines** is enough.

Then you'll see: **frameworks aren't magic — you own the core.**

Next: give it your own tool — like **reading a device's temperature**, and you've taken the first step toward a self-maintaining device agent.
