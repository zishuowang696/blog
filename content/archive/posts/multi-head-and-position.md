---
title: "为什么要 Multi-head？attention 其实「不认顺序」"
date: 2026-10-14
tags: [transformer, attention, llm, 教程]
summary: "上一篇说 Attention 是一次『软查找』。那为什么还要 Multi-head？以及——它为什么不认识词序，得靠位置编码来救？两件事，一次讲清，配最小代码。"
series: "从 0 看懂 Attention"
published: true
---

上一篇我们说：**Attention = 一次「软查找」**（Q 和所有 K 算相似度 → softmax 权重 → 加权求和 V）。

但留了两个坑没填：

1. **一个"查找"不够吗？为什么要 Multi-head？**
2. **它居然"不认顺序"？**

## 一、为什么要 Multi-head

一组 Q/K/V，只能学到**一种**"关注方式"（比如"看主语"）。

但一句话里的关系是**多种**的：
- 谁修饰谁（语法）；
- 代词指谁（指代）；
- 前后位置；
- 语气 / 语义……

所以——**同时跑几组**，每组在不同"子空间"里关注不同关系，最后拼起来。这就是 **Multi-head（多头）**。

**类比**：不是让一个专家看，而是**请几个专家同时看**：
- 一个盯语法、一个盯指代、一个盯位置……
- 每人交一份"关注权重"，**拼在一起**。

```
输入
 ├─ head 1：关注语法
 ├─ head 2：关注指代
 ├─ head 3：关注位置
 └─ ...
   ↓ 拼接
输出（信息更全）
```

**实现上很简单**：把维度切片就行（比如 8 个头，每个头管 1/8 维）：

```python
import numpy as np

def softmax(a):
    e = np.exp(a - a.max(axis=-1, keepdims=True))
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V):
    return softmax(Q @ K.T / np.sqrt(Q.shape[-1])) @ V

def multi_head(x, heads=4):
    n, d = x.shape
    dh = d // heads                       # 每个头的维度
    outs = []
    for h in range(heads):                 # 每个头在各自切片上做一次 attention
        s = x[:, h*dh:(h+1)*dh]
        outs.append(attention(s, s, s))
    return np.concatenate(outs, axis=-1)   # 拼回去

x = np.random.rand(5, 8)   # 5 个词，8 维
print(multi_head(x, 4).shape)   # (5, 8)
```

**一个头 = 一种关注方式；多头 = 多种并行。** 就这样。

## 二、attention 为什么「不认顺序」

看 attention 的公式：`softmax(QKᵀ) · V`。

**它只算"两两相似度"，跟顺序无关。** 换句话说：

> 「**猫咬狗**」和「**狗咬猫**」，喂进去算出的 attention **一模一样**。

这在语言里是**灾难**（意思完全反了）。但——**attention 自己就是认不出来。**

## 救兵：位置编码（Positional Encoding）

既然 attention 不认顺序，那就**手动把"位置"塞进去**。

做法：给每个词的向量**加上**一个"和位置有关"的向量（第 1 个位置加一个、第 2 个加另一个……最简单的用 sin/cos）：

```python
def positional_encoding(n, d):
    pos = np.arange(n)[:, None]                 # 位置 0..n-1
    i = np.arange(d)[None, :]
    angle = pos / np.power(10000, (2 * (i // 2)) / d)
    pe = np.where(i % 2 == 0, np.sin(angle), np.cos(angle))
    return pe

x = np.random.rand(5, 8)
x = x + positional_encoding(5, 8)   # 位置信息混进输入
```

这样，"第 3 个词"和"第 1 个词"就有了**不同的表示** → attention 间接"知道了位置"。

（现代模型多用 **RoPE** 这类改进版，但**目的完全一样：让模型知道词序。**）

## 记住两件事

1. **Multi-head**：一个头只懂一种关注方式 → **多头并行、各看各的、再拼起来**；
2. **位置编码**：attention **天生不认顺序** → 得**手动加位置信息**（sin/cos 或 RoPE）。

---

**下一篇**：Q / K / V 到底**从哪来**？（是输入乘上三组权重 `Wq / Wk / Wv` 得到的——那才是"可学习"的关键。）

> 💬 Multi-head 这块，你觉得"多请几个专家"的比喻贴切吗？
> 🛠️ 需要嵌入式 / 边缘 AI / Agent 定制与咨询？见 [关于页](/about)。
