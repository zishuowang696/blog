# 第 2 期素材包：多源分段下载（aria2）

- 关联文章：`/posts/multi-source-download`
- 关联工具：`aria2`（`-x/-s/-k/-j/-c`，多 URI = 多镜像）
- 形式：屏录（终端为主）+ 不露脸，TTS 配音
- 定位：**全球通用**（不限国内）——大文件、镜像聚合、断点续传
- 真实数据：单连接 1.19 MB/s；curl 6 连接 ~6 MB/s；aria2 3 镜像×8 连接 ~6 MB/s（本机总带宽到顶）

---

## 一、YouTube（英文）

### 标题候选
1. Multi-Source Segmented Downloads: When More Connections Actually Help
2. aria2 in Practice: Mirrors, Segments, and Finding the Real Bottleneck
3. Your Download Is Slow — But Is It Throttling or Link Saturation?

> 推荐 1 或 3（"判断瓶颈"是通用痛点）。

### 前 15 秒（钩子）
> "Your download is slow. Before you add more connections — is the server throttling you, or is your link already maxed out? Those need opposite fixes. Here's how to tell, and how to do multi-source segmented downloads with aria2."

### 正文脚本（6–10 分钟）
**0:00–0:30 结论先行**
- 屏幕：`aria2c` 多源下载界面 + 速度表。
- 口播：两种慢、两种解法。

**0:30–2:00 判断瓶颈**
- 演示：单连接 vs 多连接聚合。
- 展示实测表：1.19 → 6（到顶）。
- 金句："If aggregate plateaus, it's your link, not the server."

**2:00–4:30 aria2 用法**
- `-x`/`-s`/`-k`/`-j`/`-c` 逐个演示。
- 单文件多镜像；输入文件多文件多镜像。
- 现场跑一个多源下载。

**4:30–6:00 校验与注意**
- `sha256sum -c`；`--checksum`。
- 别打爆服务器；确认 Range；带宽到顶就别加连接。

**6:00–7:00 收尾**
- 三条：先测 / 被限速才多源 / 永远校验。
- CTA："Link to the script in the description."

### 简介
```
Two kinds of slow downloads: per-connection throttling (more connections help)
vs link saturation (they don't). Measure, then use aria2 for multi-source segments.

Write-up: https://blog-worker.zishuowang696.workers.dev/posts/multi-source-download

Chapters:
0:00 Two kinds of slow
0:30 Find the bottleneck
2:00 aria2 options
4:30 Verify + caveats
6:00 Takeaways

#aria2 #DevOps #Download #Linux #Networking
```

### 封面
- 大字：`THROTTLED or SATURATED?`
- 副标题：`multi-source downloads with aria2`
- 背景：终端速度对比

---

## 二、抖音（中文，竖屏）

### 片段 1：判断瓶颈（20–30 秒）
- 钩子（0–3s）："下载慢别急着加线程——先判断是被限速，还是你带宽到顶了。"
- 正文：单连接 vs 6 连接对比；"聚合到 6 就不涨 = 你线路到顶"。
- 收尾："下一集给你一条命令。"

### 片段 2：aria2 多源分段（20–35 秒）
- 钩子："同一个文件，从三个镜像同时分段下载。"
- 正文：`aria2c -x 8 -s 8 -k 1M -c 镜像1 镜像2 镜像3 -o file`。
- 收尾："大模型权重、数据集都这么下，收藏。"

### 片段 3：避坑（20–30 秒）
- 钩子："多线程不是万能，服务器不支持 Range 就白搭。"
- 正文：确认 Range；别打爆服务器；`sha256sum -c` 校验。
- 收尾："先测速，再决定加不加连接。"

### 抖音简介
```
下载慢：先分清"被限速"还是"带宽到顶"；被限速就用 aria2 多源分段。
文章：blog-worker.zishuowang696.workers.dev/posts/multi-source-download
```

---

## 三、GitHub 动作
- 把 aria2 多源封装进 `scripts/`（例如给 `pull-dl-cache.sh` 增加 `--aria2` 模式）
- README / docs 补一节 "multi-source downloads"

## 四、素材清单（录制前）
- [ ] 终端：单连接 vs 多连接速度对比
- [ ] 终端：`aria2c` 多镜像下载界面（含 `-x/-s` 摘要）
- [ ] 终端：`sha256sum -c` 校验
- [ ] 一张对比图：throttled vs saturated

## 五、发布顺序
1. GitHub：脚本/文档更新
2. YouTube：长视频 + 1 Short
3. 抖音：3 条片段
4. 与第 1 期互相引用（第 1 期讲"用 CI 当下载代理"，本期讲"下载本身怎么加速"）
