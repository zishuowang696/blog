---
title: "Attention 到底是什么？其实就是一次「软查找」"
date: 2026-10-14
tags: [transformer, attention, llm, 教程]
summary: "别被 Transformer / “Attention is all you need” 吓到——先只搞懂最小的一块：Attention。用你天天用的哈希表类比，一次讲清 Q/K/V，配 20 行 numpy 让你自己算一遍。"
series: "从 0 看懂 Attention"
published: true
---

不用被 **Transformer** 和那句 **"Attention Is All You Need"** 吓到。先只搞懂最小的一块——**attention（注意力）**。搞懂它，后面全是顺的。

## 先回忆一个你天天用的东西：哈希表

哈希表你太熟了：**给一个 key → 取对应的 value。**

**Attention 就是它的"软版本"：**

- 不是"精确匹配一个 key"，而是**和所有 key 算相似度**；
- 不是"只取一个 value"，而是**按相似度，加权混合所有 value**。

一句话：

> **Attention = 一次「软查找」。**

**为什么叫"软"？** 因为它是**连续的、可微的**——所以能反向传播、能被训练。普通哈希表做不到这一点，**这正是关键**。

## 三个角色：Q / K / V

| 名字 | 含义（一句话） |
| --- | --- |
| **Query（Q）** | 我在找什么 |
| **Key（K）** | 我是什么（用来被匹配） |
| **Value（V）** | 我的内容（被取走的东西） |

## 一个最小的例子

3 个词：「**猫 坐 垫子**」。为了好算，每个词用一个 **2 维向量**表示（真实里是几百维，道理一样）。

```
猫   = [1, 0]
坐   = [0, 1]
垫子 = [1, 1]
```

最简情形让 **Q = K = V = 输入**（这就是 self-attention：自己看自己）。三步：

1. **每个词的 Q 和所有 K 做点积** → 相似度分数；
2. **softmax** → 变成权重（每行加起来 = 1）；
3. **用权重对所有 V 加权求和** → 输出。

## 20 行跑一遍

```python
import numpy as np
np.set_printoptions(precision=2, suppress=True)

# 3 个词，每个 2 维（示意）
x = np.array([[1., 0.],   # 猫
              [0., 1.],   # 坐
              [1., 1.]])  # 垫子

def softmax(a):
    e = np.exp(a - a.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

Q = K = V = x                        # 最简：Q/K/V 就是输入自己
scores  = Q @ K.T / np.sqrt(2)       # 相似度矩阵（点积）
weights = softmax(scores)            # 每行归一化成权重
out     = weights @ V                # 加权求和

print("权重:\n", weights)
print("输出:\n", out)
```

**怎么读输出**：`weights[i][j]` = "第 i 个词关注第 j 个词的程度"。
例如 `weights[1]` 就是"**坐**"在看谁——哪个权重大，它就"混进"了谁的信息。

## 你只要记住三件事

1. **Attention = 软查找**：点积算相似度 → softmax 成权重 → 加权求和；
2. **Q / K / V**：我在找什么 / 我是什么 / 我的内容；
3. 因为**可微**，所以它**能被训练**——这才是它比"查表"强的地方。

---

**下一篇**：为什么需要 **Multi-head**？以及 attention 为什么"**不认顺序**"（于是要加位置编码）。

> 💬 看完这段，"attention"是不是没那么玄了？评论区聊聊。
> 🛠️ 需要嵌入式 / 边缘 AI / Agent 定制与咨询？见 [关于页](/about)。
