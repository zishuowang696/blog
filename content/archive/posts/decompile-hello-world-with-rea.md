---
title: "演示：让 AI Agent（REA）反编译一个 Hello World"
date: 2026-10-14
tags: [reverse-engineering, ai-agent, mcp, tutorial]
summary: "REA 到底怎么用？拿最小的目标练手：一个 strip 过的 Hello World。三步走——备好目标、接上 REA、一句自然语言提问，看它把二进制变成伪代码 + 证据。"
series: "AI 工具评测"
published: true
---

上一篇聊了 [REA（让 AI Agent 逆向任何软件）](/posts/rea-reverse-engineer-anything-review)。这篇**演示它怎么用**——拿最小的目标：一个 **Hello World**。

全程三步：**备好目标 → 接上 REA → 一句话提问。**

## Step 1：备好"目标"（一个 strip 过的二进制）

```c
#include <stdio.h>
int main(void) { printf("Hello, REA!\n"); return 0; }
```

```bash
gcc -O0 -s hello.c -o hello     # -s：strip 掉符号，模拟"没有源码"
```

现在 `hello` 是一个 **ELF64、已 strip、没有函数名** 的二进制——正是"逆向"的典型起点。

## Step 2：把 REA 接到你的 Agent

```bash
npx rea-agents setup
```

按提示**选你的 agent**（Claude Code / Codex / Cursor…），它会：
- 给 agent 注册 **REA 的 MCP server**；
- 安装对应的**工作流指令**；
- 备份你原有的配置。

**一个前提**：**原生二进制**（像这个 ELF）需要一个**分析引擎**——**Ghidra（免费）**、Hopper 或 IDA。JS / .NET 的静态分析则免引擎。装好引擎、重启 agent，就能用了。

## Step 3：一句自然语言，让它干活

在 agent 里，你只需要说人话：

> **"反编译 `./hello`，说明 `main` 到底干了什么，并把那个字符串还原出来。"**

（也可以走命令行：`npx rea-agents@latest` 的 analyze 命令，逻辑一样。）

## 你会拿到什么

REA 把结果**连同证据一起**给 agent，典型回应是：

- **伪代码**（大致就是 `int main() { puts("Hello, REA!"); return 0; }`）；
- **对应的汇编 / 字符串 / 调用关系**——作为**证据**；
- 以及它的**局限**（哪些是推断、哪些没把握）。

**这就是 REA 的定位**：它不说"相信我"，而是**"结论 + 证据 + 局限"**——这一点比"AI 拍脑袋"靠谱得多。

而且你还能**接着追问**，让 agent 深入：

> "那个字符串在文件里哪个地址？为什么调的是 `puts` 而不是 `printf`？"

（后者其实是：编译器把 `printf("...\n")` **优化成了 `puts`**——AI 能帮你把这个点出来。）

## 关键：它快，但你得能验证

> **REA 省的是"读汇编"的时间，不是"理解"的责任。**

它给你伪代码，**你需要能验证**（比如随手 `objdump -d` 看一眼、`strings` 对一下）。所以才建议你**好歹会看一点底层**——不是为了自己手撸，而是为了**验收 AI 的结论**。

## 小结

- **REA = AI 版的"逆向助手"**：你写 server 的工具、它负责接通引擎与 agent；
- 用法极简：**备目标 → 装 REA → 一句话提问 → 看伪代码 + 证据**；
- **别把它当魔法**：它是"提速器"，**判断和验证，还得靠你。**

---

> **下一步（合法、有护城河）**：找一个**你拥有的设备固件**里的**一个小函数**（CRC / 校验 / 协议打包），用同样的流程反出来，**重写成你自己的代码**——那才是 REA 真正值钱的地方。

> 💬 你会先拿它反什么？（学习 / 互操作 / 安全 ✅；抄 / 破 ❌）
> 🛠️ 需要嵌入式 / 边缘 AI / Agent 定制与咨询？见 [关于页](/about)。
