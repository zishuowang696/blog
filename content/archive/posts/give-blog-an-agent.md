---
title: "我给博客配了个 Agent：每周自动出选题"
date: 2026-10-11
tags: [ai-agent, 自动化, github-actions, 内容运营, 教程]
summary: "内容运营最烦的是选题——靠感觉、还费时间。我写了个最小 Agent，跑在 GitHub Actions 上，每周自动读我已有文章、给出 5 个新选题。本质还是那个循环：问模型 → 执行工具 → 回喂结果。附可复用模板。"
series: "从 0 构建 AI Agent"
published: true
---

写博客最烦的不是写，是**选题**——今天写啥？靠感觉、还费时间。

所以我给它配了个 **Agent**：每周一自动读一遍我**已发布的文章**（避免重复），然后**给出 5 个新选题**。跑在 **GitHub Actions** 上，**免费、定时、不要服务器**。

本质还是那句话：**Agent 就是一个循环——调用 API 问模型 → 执行工具 → 回喂结果。**

## 它到底做了什么

一个循环 + 一个工具：

```python
TOOLS = [{
    "type": "function",
    "function": {
        "name": "list_existing_titles",
        "description": "读取博客已有的文章标题，用于避免选题重复",
        "parameters": {"type": "object", "properties": {}},
    },
}]

def run_tool(name, args):
    if name == "list_existing_titles":
        xml = urlopen(FEED).read().decode("utf-8", "ignore")   # 读站点 RSS
        titles = re.findall(r"<title>(.*?)</title>", xml, re.S)
        return "\n".join(titles[1:])
```

模型用 DeepSeek（OpenAI 兼容），循环：

```python
def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        msg = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS).choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            return msg.content                     # 不再要工具 -> 给答案
        for call in msg.tool_calls:                # 执行工具 -> 回喂结果
            args = json.loads(call.function.arguments or "{}")
            messages.append({"role": "tool", "tool_call_id": call.id,
                             "content": run_tool(call.function.name, args)})
```

结果写进 `weekly/<日期>.md`。就这样——**没有框架，就一个循环**。

## 为什么跑在 GitHub Actions

这是我认为它最妙的一点：

- **免费**：public 仓库无限时长；
- **定时**：`on: schedule: cron`，每周一自动跑；
- **免服务器**：不用养机器；
- **能上外网**：runner 在**美国**，直达 DeepSeek / Google API；
- **有仓库权限**：能把结果**提交回仓库**。

```yaml
on:
  schedule: [{ cron: '0 1 * * 1' }]
  workflow_dispatch: {}
permissions: { contents: write }
# ... pip install -> python agent/topics.py -> git commit weekly/
```

密钥放 **Secret**（`DEEPSEEK_API_KEY`），站点地址放 **Variables**（`SITE_FEED`/`SITE_BRIEF`）——**不进代码**。

## 它真出活了

第一次跑完，它读了站上 17 篇已发文章，回了我一段（节选）：

> 现有内容偏「底层构建 / 框架原理」，但 **「Agent 真正跑在边缘设备上」这条主线还几乎是空白**。下面 5 个选题全部落在这个交叉缺口上……

然后给了 5 个选题 + **排期建议**（先引流、再转化、护城河收口）。说实话，**比我拍脑袋强**。

## 我的原则：Agent 干脏活，人做判断

这也是我为什么把它做小、并且**只公开框架**：

- **Agent 干脏活 / 半成品**：选题、草稿、复盘、分发文案；
- **人做判断与发布**：选哪个、怎么写、发不发；
- **公开架构，私有数据**：框架可以开源，但**数据、密钥、关键词库、商业策略**留私有。

比如这个 Agent 我的**真实 prompt、关键词库、GSC 数据**都留在私有仓库——公开的只是"**怎么搭**"。

## 下一步

- 加个工具**读 GSC 导出**（"有曝光无点击"的词优先选题）；
- 再加个"**草稿 Agent**"（出中英初稿）；
- 但**发布永远留给人**。

> 📦 可复用模板（去掉私料）：**[github.com/zishuowang696/weekly-topics-agent](https://github.com/zishuowang696/weekly-topics-agent)**
>
> 💬 有什么想让它干的活？**在下方评论**，或到 GitHub [提 Issue](https://github.com/zishuowang696/weekly-topics-agent/issues)。

*（本文中英双语；本系列记录从 0 构建 Agent 的过程。）*
