# 增长运营手册（GitHub / YouTube / 抖音）

目标：**平台账号增长**（GitHub star/follow、YouTube 订阅、抖音粉丝），博客只作引用落地页。
人设：**"我在维护一个真实的 Jetson Linux 发行版（Yocto/KAS）+ 边缘 AI 网关"**——build in public 连载，不做通用教程号。

硬件基线：Jetson Orin Nano。核心仓库：`embedai`。

---

## 1. 内容引擎：一次实操，三平台复用

```
每周一个真实实验（拍一次）
├─ GitHub  : commit / Release / README 更新（英文，锚点）
├─ YouTube : 8–15 分钟长视频 + 1–2 个 Shorts（英文配音+字幕，不出镜）
└─ 抖音    : 1–3 条竖屏短视频（中文，前 3 秒强钩子）
     三平台互相挂链接：视频简介→GitHub，README→视频
```

**原则**：内容来自真实命令/日志/报错，拒绝空泛教程。每个视频都对应一个能跑的仓库状态或 Release。

---

## 2. 不出镜的 AI 工作流

| 环节 | 工具（任选） | 说明 |
| --- | --- | --- |
| 脚本 / 标题 / 钩子 | ChatGPT / Claude（就是我） | 我按素材产出中英文脚本 |
| 配音（英/中） | ElevenLabs、剪映"朗读"、Azure TTS | 无需真人出声 |
| 屏幕录制 | OBS、asciinema、系统录屏 | 终端/浏览器为主 |
| 板子特写 | 手机 + 支架 | 拍刷机、接线、上电，**不露脸** |
| 剪辑 + 字幕 | 剪映专业版 / CapCut（自动字幕） | 模板化，省时间 |
| 封面 | Canva / 截屏 + 大字标题 | 终端截图做底，强对比文字 |
| 竖屏切片 | 剪映"一键成片"或手动裁 | 从长视频剪高光 |

> 结论：**2 小时/周可行**，但必须"批量拍摄"：每 2–3 周集中拍一次（约 3 小时），之后每周只做剪辑+发布。

---

## 3. 每周 2 小时流程

| 时长 | 动作 | 产出 |
| --- | --- | --- |
| 20 min | 跑命令、存日志/截图、拍板子 B-roll | 原始素材 |
| 40 min | 剪长视频（模板+自动字幕） | YouTube 长视频 |
| 25 min | 剪 2–3 条竖屏 + 写钩子 | 抖音/Shorts |
| 20 min | 发布三平台 + 更新 GitHub | Release/README/简介 |
| 15 min | 回评论、记录选题 | 下期素材 |

**批量拍摄日（每 3 周一次）**：一次拍 3 期素材 → 之后 3 周每周只剪+发。

---

## 4. 平台 Checklist

### GitHub（`embedai`）
- [ ] README：一句话价值 + 架构图 + 快速开始 + Demo GIF + 徽章（CI/Release）
- [ ] topics：`yocto` `kas` `jetson` `tegra` `edge-ai` `embedded-linux`
- [ ] 每期：Release + changelog，README 挂当期视频链接
- [ ] Issues/Discussions 模板；把观众问题变成下期选题
- [ ] 去 awesome-yocto / OE4T 社区 / r/embedded 发一次

### YouTube
- [ ] 标题含关键词（Jetson Orin / Yocto / KAS）
- [ ] 前 15 秒给"结果 + 痛点"，不做长片头
- [ ] 章节时间轴；播放列表=系列
- [ ] 每条长视频切 1–2 个 Shorts
- [ ] 简介：GitHub 链接 + 命令要点

### 抖音
- [ ] 竖屏 9:16，前 3 秒钩子（结论/翻车/对比）
- [ ] 15–60 秒，字幕常显，节奏快
- [ ] 标题带搜索词（Jetson / Yocto / 刷机 / 嵌入式）
- [ ] 同一素材剪多条测不同钩子
- [ ] 简介引流 GitHub（注意平台外链规则）

---

## 5. 指标与复盘（每月一次）

| 平台 | 核心指标 |
| --- | --- |
| GitHub | star、followers、Release 下载、issue 数 |
| YouTube | 订阅、CTR、平均观看时长、Shorts 播放 |
| 抖音 | 粉丝、完播率、点赞/收藏、涨粉来源 |

复盘：哪类钩子/选题有效 → 放大；无效则换形式。前 30 天不追量，先跑顺流程、攒 4–6 期。

---

## 6. 目录

- `growth/episodes.md`：10 期选题 backlog + 抖音快剪选题
- `growth/episode-01.md`：第 1 期完整素材包（YouTube 脚本 / 抖音脚本 / GitHub Release / 封面文案）
- `growth/commercial-plan.md`：商业路线（服务清单 / 客户 / 定价 / 获客 / 1–3 年时间表 / 风险红线）
