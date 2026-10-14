---
title: "Attention explained: it's just a soft lookup"
summary: "Don't be scared by Transformer or 'Attention Is All You Need' — start with the smallest piece: attention. Explained with the hash table you already know, plus 20 lines of numpy so you can compute it yourself."
---

Don't be intimidated by **Transformer** or the line **"Attention Is All You Need"**. Start with the smallest piece — **attention**. Get this, and the rest follows.

## Recall something you use every day: a hash table

You know hash tables: **give a key → get the value.**

**Attention is the "soft" version of that:**

- Instead of exactly matching *one* key, it **computes similarity against *all* keys**;
- Instead of taking *one* value, it **returns a similarity-weighted blend of *all* values**.

In one line:

> **Attention = one "soft lookup".**

**Why "soft"?** Because it's **continuous and differentiable** — so it can backpropagate and be trained. An ordinary hash table can't, and **that's the whole point**.

## Three roles: Q / K / V

| Name | Meaning (one line) |
| --- | --- |
| **Query (Q)** | what I'm looking for |
| **Key (K)** | what I am (to be matched against) |
| **Value (V)** | my content (what gets taken) |

## A minimal example

Three words: "**cat sat mat**". To keep it simple, represent each word as a **2-d vector** (real life is hundreds of dims; same idea).

```
cat = [1, 0]
sat = [0, 1]
mat = [1, 1]
```

Simplest case: let **Q = K = V = the input** (this is self-attention: a sentence looking at itself). Three steps:

1. **Dot each word's Q against all K** → similarity scores;
2. **softmax** → weights (each row sums to 1);
3. **Weighted-sum all V** → the output.

## 20 lines to run it

```python
import numpy as np
np.set_printoptions(precision=2, suppress=True)

# three words, 2 dims each (illustrative)
x = np.array([[1., 0.],   # cat
              [0., 1.],   # sat
              [1., 1.]])  # mat

def softmax(a):
    e = np.exp(a - a.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

Q = K = V = x                        # simplest: Q/K/V are the input itself
scores  = Q @ K.T / np.sqrt(2)       # similarity matrix (dot products)
weights = softmax(scores)            # normalize each row into weights
out     = weights @ V                # weighted sum

print("weights:\n", weights)
print("output:\n", out)
```

**How to read it**: `weights[i][j]` = "how much word i attends to word j". So `weights[1]` is where "**sat**" is looking — whichever weight dominates, that word's info gets mixed in.

## Just remember three things

1. **Attention = a soft lookup**: dot-product similarity → softmax weights → weighted sum;
2. **Q / K / V**: what I'm looking for / what I am / my content;
3. Because it's **differentiable**, it **can be trained** — that's what beats a plain lookup table.

---

**Next**: why **multi-head**? And why attention is "**order-blind**" (so we need positional encoding).
