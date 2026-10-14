---
title: "Why multi-head? And why attention is 'order-blind'"
summary: "Last post: attention is one 'soft lookup'. So why multi-head at all? And why is it order-blind, needing positional encoding to rescue it? Two things, explained with minimal code."
---

Last post we said: **attention = one "soft lookup"** (dot each Q against all K → softmax weights → weighted-sum V).

But we left two open questions:

1. **Isn't one "lookup" enough? Why multi-head?**
2. **It's *order-blind*?**

## 1. Why multi-head

One set of Q/K/V can only learn **one** kind of "attention" (say, "look at the subject").

But a sentence carries **many** relationships:
- who modifies whom (syntax);
- which pronoun refers to what (coreference);
- relative position;
- tone / semantics…

So — **run several in parallel**, each attending in a different subspace, then concatenate. That's **multi-head**.

**Analogy**: don't ask one expert; **ask several at once**:
- one watches syntax, one watches coreference, one watches position…
- each returns its own "attention weights" — then **concatenate**.

```
input
 ├─ head 1: syntax
 ├─ head 2: coreference
 ├─ head 3: position
 └─ ...
   ↓ concatenate
output (richer)
```

**And the implementation is trivial**: just split the dimensions (8 heads → each head handles 1/8 of the dims):

```python
import numpy as np

def softmax(a):
    e = np.exp(a - a.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V):
    return softmax(Q @ K.T / np.sqrt(Q.shape[-1])) @ V

def multi_head(x, heads=4):
    n, d = x.shape
    dh = d // heads                       # dims per head
    outs = []
    for h in range(heads):                 # each head attends on its own slice
        s = x[:, h*dh:(h+1)*dh]
        outs.append(attention(s, s, s))
    return np.concatenate(outs, axis=-1)   # concatenate back

x = np.random.rand(5, 8)   # 5 words, 8 dims
print(multi_head(x, 4).shape)   # (5, 8)
```

**One head = one attention pattern; multi-head = many in parallel.** That's all.

## 2. Why attention is "order-blind"

Look at the formula: `softmax(QKᵀ) · V`.

**It only computes pairwise similarity — order is irrelevant.** In other words:

> "**cat bites dog**" and "**dog bites cat**" produce **exactly the same** attention.

For language that's a **disaster** (the meaning flips). And attention **can't tell the difference on its own.**

## The fix: positional encoding

Since attention is order-blind, **inject position manually.**

How: **add** a position-dependent vector to each word's embedding (position 1 gets one, position 2 another… simplest with sin/cos):

```python
def positional_encoding(n, d):
    pos = np.arange(n)[:, None]                 # positions 0..n-1
    i = np.arange(d)[None, :]
    angle = pos / np.power(10000, (2 * (i // 2)) / d)
    pe = np.where(i % 2 == 0, np.sin(angle), np.cos(angle))
    return pe

x = np.random.rand(5, 8)
x = x + positional_encoding(5, 8)   # position info folded into the input
```

Now "the 3rd word" and "the 1st word" have **different representations** → attention indirectly "knows" position.

(Modern models mostly use **RoPE** and friends, but the **goal is identical: tell the model the order.**)

## Remember two things

1. **Multi-head**: one head learns one attention pattern → **run several in parallel, then concatenate**;
2. **Positional encoding**: attention is **inherently order-blind** → **add position info manually** (sin/cos or RoPE).

---

**Next**: where do Q / K / V actually **come from**? (The input multiplied by three weight matrices `Wq / Wk / Wv` — which is what makes it *learnable*.)
