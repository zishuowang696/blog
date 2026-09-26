# 冷启动：拿流量 + 拿好评（GitHub / YouTube / 抖音）

配套：`episodes.md`（选题）、`episode-01/02.md`（素材包）、`commercial-plan.md`（变现）。
产品定位见仓库 `embedai/docs/12-positioning.md` 与 `13-landscape.md`。

## 目标
- **0–90 天**：GitHub 首批 star（100+）、YouTube 首发、抖音起量、拿到第一批"好评"（转发/引用/收录/正面 issue）。
- **中长期**：被 awesome 列表/社区收录，成为「Jetson 生产发行版 / 模型上板」的关键词。

## 核心策略：用「真实数据 + 对比」换注意力
- **数据是最好的钩子**：镜像大小、启动时间、内存、模型延迟/功耗——**对比** JetPack / jetson-containers。
- **诚实标注限制**（QEMU 无 GPU、目前只支持 Jetson）→ 反而赢信任。
- 叙事主线：**别人做开发体验，我们做生产交付**（更小、更稳、可复现、可更新、有数据）。

## 渠道与动作

### GitHub（锚点，一切回流到这里）
- README：一行价值 + 对比表 + 三行 quickstart + 数据截图 + Release。
- topics；awesome-yocto / awesome-jetson 等列表提 PR；去 OE4T 社区发一次。
- 每个视频/文章的简介都回链 repo。

### 英文社区（冷启动主战场）
- Reddit：r/embedded、r/JetsonNano、r/linux
- Hacker News：`Show HN: ...`（挑有数据的那篇）
- lobste.rs；Yocto/OpenEmbedded 邮件列表；OE4T Discord/Matrix
- dev.to / Hashnode（同步英文文章）

### 中文社区（学生 + 工程师）
- 掘金、知乎、V2EX、B 站；抖音（快剪）

### YouTube
- 长视频 + Shorts，标题带关键词（Jetson / Yocto / TensorRT）；简介回链 repo + 文章

## 「好评」怎么来（可操作清单）
- **能跑通**：quickstart 三行命令必须成功，CI 常绿。
- **有数据**：benchmark、对比、限制说明（别吹）。
- **有响应**：issue / 评论 24h 内回复。
- **scope 清晰**：明确"做什么 / 不做什么"。
- **可引用**：给一句可直接转发的话 + 一张对比图。
- **持续**：稳定更新（周更/双周更）。

## 30 / 60 / 90 天
| 阶段 | 动作 |
| --- | --- |
| 30 天 | README/Release/CI 完备；发 2 篇（GitHub 下载加速、KAS）+ 2 视频；提交 awesome 列表；Reddit/HN 各 1 次 |
| 60 天 | 出「模型上板」实测（真实数据）；对比 JetPack / jetson-containers；开 Discussions/Discord |
| 90 天 | 形成系列；争取被收录/被引用；复盘数据、调整选题 |

## 指标
- GitHub：star、fork、issue、被引用/收录数
- YouTube：订阅、完播、CTR
- 抖音：粉丝、完播率
- 好评：转发/推荐/收录/合作邀约

## 一条原则
**不追噱头，追"可复现的事实"。** 数据和能跑通的东西，会自己带来流量与口碑。
