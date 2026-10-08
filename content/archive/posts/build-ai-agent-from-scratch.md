---
title: "从 0 构建一个 AI Agent：本质就是一个循环"
date: 2026-09-30
tags: [ai-agent, 智能体, 教程, function-calling, deepseek]
summary: "抛开所有框架，Agent 的本质就是一个循环：调用 API 问模型 → 执行工具 → 回喂结果。用 DeepSeek 和一段完整可跑的代码讲清它。"
series: "从 0 构建 AI Agent"
published: true
---

市面上的 Agent 框架层出不穷，容易让人以为里面有什么高深的东西。**其实没有**。

**Agent 的本质，就是一个循环**：

> **调用 API 问模型 → 执行工具 → 回喂结果**，如此往复，直到拿到答案。

下面是一段**完整、可跑**的最小 Agent——模型用 **DeepSeek**，示例工具用最朴素的 `cat`（读文件）。看完你就会发现：所有框架，都只是把这个循环包得更顺手。

## 完整代码

```python
import json, subprocess
from openai import OpenAI

# DeepSeek 提供 OpenAI 兼容接口，直接用它
client = OpenAI(
    base_url="https://api.deepseek.com",
    api_key="sk-你的DeepSeek密钥",
)

# 1) 工具定义：告诉模型"有哪些函数、参数是什么"
TOOLS = [{
    "type": "function",
    "function": {
        "name": "cat",
        "description": "读取一个文件的全部内容",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "文件路径"},
            },
            "required": ["path"],
        },
    },
}]

# 2) 工具实现：真正干活的代码（模型不执行，你的代码执行）
def run_tool(name, args):
    if name == "cat":
        return subprocess.run(
            ["cat", args["path"]], capture_output=True, text=True
        ).stdout
    return f"unknown tool: {name}"

# 3) Agent 主循环
def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        # ① 调用 API 问模型
        reply = client.chat.completions.create(
            model="deepseek-chat", messages=messages, tools=TOOLS
        )
        msg = reply.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:                 # 模型不再要工具 -> 给出答案
            return msg.content
        # ② 执行工具  ③ 回喂结果
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            result = run_tool(call.function.name, args)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": result,
            })

print(agent("读一下 /etc/hostname 里的内容"))
```

每一轮循环只做三件事：

> **① 调用 API 问模型 → ② 执行工具 → ③ 回喂结果**，然后回到 ①，直到模型给出最终答案。

所有"框架"——LangChain、AutoGen、你见过的任何一个——**都只是把这几十行包得更顺手**：加日志、加记忆、加并发、加 UI。循环没变。

理解了这一点，下面几个概念就都好懂了。

## 一、工具调用：模型决定，你的代码执行

看上面的 `cat`：模型本身只会"说话"，不会"做事"。我们做的是——

- 把 `cat` 的**名字和参数**告诉模型（那段 `TOOLS` schema）；
- 模型决定**要不要调、传什么路径**；
- **`run_tool` 去真正执行**，把结果回喂给下一轮。

关键在这句：**模型不执行任何东西**，它只输出"我想 `cat` 一下 `/etc/hostname`"。**真正动手的永远是你的代码**——这既是安全边界（你能拦、能审），也是为什么"给模型一双干净的手"比"给它一百个工具"更重要。

> 别贪多。**先给 3 个真用得上的工具**，就够它干很多事。

## 二、记忆：短期靠拼，长期靠检索

模型**没有记忆**——每次调用都是"新人"。上面代码里，Agent 的"记忆"其实就是那个不断增长的 `messages` 列表，是我们在**回喂结果**时一并带回去的上下文：

- **短期**：把对话历史拼进 `messages`。简单，但越拼越长、越贵。
- **长期**：把要点存进**向量库**，需要时**检索**回来。省 token，且能无限扩展。

**先做短期**，等到量大或要跨会话回忆，再上长期。

记住一句话：**记忆不是"存下来"，而是"下次能取出来"。**

## 三、可观测：Agent 的调试就是"看轨迹"

模型是**不确定**的：同样的输入，可能走完全不同的路径。所以你**看不到它每一步在干嘛，就根本没法调**。

至少要能看见：每一轮**模型的决定**、每一次**工具调用**的参数与结果（`run_tool` 那里就是最好的埋点位置）、以及**时间和失败**卡在哪里。

> **Agent 调试的本质，是读它的执行轨迹。**

## 四、换模型只要一行

上面代码用的是 **DeepSeek**（OpenAI 兼容接口）。想换别的模型——GPT、Claude、任意推理服务——**只要改 `base_url`、`api_key` 和 `model` 这几处**，`agent()` 的循环一个字都不用动。

> 这就是**接口标准化**的好处：模型是可替换的零件，你这个循环才是资产。

## 下一步：把 `cat` 用出花来

有意思的是，`cat` 这个最普通的工具，就足以做出一个**设备自运维 Agent**：

- 读温度：`cat /sys/class/thermal/thermal_zone0/temp`
- 读内存：`cat /proc/meminfo`
- 读负载：`cat /proc/loadavg`

当模型学会"**先 `cat` 一下温度，再决定要不要降频**"时，你就已经迈出了边缘设备自运维的第一步。**工具不必花哨，能读、能看，它就能判断。**

---

**一句话收尾**：**Agent 的本质，就是一个循环——调用 API 问模型 → 执行工具 → 回喂结果。** 框架会变，这个循环不会。
