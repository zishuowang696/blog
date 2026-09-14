# 第 1 期素材包：GitHub 下载加速 + 让 CI 当下载代理

- 关联文章：`/posts/github-download-acceleration`
- 关联仓库：`embedai`（`scripts/speedtest-github.sh`、`scripts/pull-dl-cache.sh`、`docs/10-github-mirrors.md`）
- 形式：屏录（终端为主）+ 不露脸，TTS 配音
- 核心数据（真实）：直连 GitHub 超时；ghproxy.net 1.19 MB/s；6 路并行 ~6 MB/s；GitHub Actions fetch 20.6 GB 约 40 分钟；Release 缓存 11 分卷

---

## 一、YouTube（英文）

### 标题候选
1. My First Build Took 3 Days — So I Made GitHub Download Everything (20 GB in 40 min)
2. Using GitHub Actions as a Download Proxy (Offline Reproducible Builds)
3. GitHub Download Acceleration: Measure First, Then Let CI Fetch

> 推荐 1（有反差 + 具体数字）。

### 前 15 秒（钩子）
> "My first Yocto build took three days. The bottleneck wasn't compiling — it was downloading. So I made GitHub Actions download everything for me: 20 GB in about 40 minutes. Here's the trick."

### 正文脚本（8–12 分钟）
**0:00–0:30 结果先行**
- 屏幕：Release 页面 11 个分卷 / 20.6 GB；本地 `kas build` 离线跑起来。
- 口播：结论 + 今天讲什么。

**0:30–2:00 问题：不是编译慢，是下载慢**
- 展示：一堆上游源（GitHub / kernel.org / SourceForge / huggingface），墙下随便一个卡一天。
- 金句："Download and compile are two different problems. Separate them."

**2:00–3:30 第一步：先测速**
- 演示 `scripts/speedtest-github.sh`，展示表格（直连超时 vs ghproxy.net 1.19 MB/s）。
- 强调：别凭印象选镜像。

**3:30–5:00 第二步：小文件用代理前缀**
- 演示 `curl -L -C - -O "https://ghproxy.net/https://github.com/..."` + 并行 + sha256。

**5:00–8:00 第三步：让 GitHub 当下载代理（核心）**
- 讲存储选型：Actions cache 10 GB 上限 vs **Release assets 不限总量**。
- 展示 `fetch-cache.yml`：runner 上 `bitbake --runall=fetch` → 打包 1.9 GB 分卷 → 上传 Release。

**8:00–10:00 第四步：本地拉回 + 离线构建**
- 演示 `EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh`。
- `BB_NO_NETWORK=1 kas build kas.yml` —— 缺源立刻报错。

**10:00–11:00 收尾**
- 三条经验：先测速 / 下载与编译分离 / 大缓存用 Release。
- CTA："Scripts in the repo. Subscribe for embedded Linux builds."

### 简介
```
First build: 3 days, mostly downloads. Then: GitHub Actions fetches 20GB in ~40 min,
packaged as split Release assets, pulled locally and built offline with BB_NO_NETWORK=1.

Repo: https://github.com/zishuowang696/embedai
Write-up: https://blog-worker.zishuowang696.workers.dev/posts/github-download-acceleration

Chapters:
0:00 Result first
0:30 Download vs compile
2:00 Measure first (speed test)
3:30 Proxy prefix for small files
5:00 CI as a download proxy
8:00 Pull locally, build offline
10:00 Takeaways

#Yocto #GitHub #CI #EmbeddedLinux #DevOps
```

### 封面
- 大字：`3 DAYS → 40 MIN`
- 副标题：`Let GitHub download it`
- 背景：终端里 `aria2c` / Release 分卷列表

---

## 二、抖音（中文，竖屏）

### 片段 1：钩子（20–30 秒）
- 钩子（0–3s）："首次编译 3 天，你以为是编译慢？其实全耗在下载。"
- 正文：展示一堆上游源 + 直连超时；"先测速"。
- 收尾："下一集教你把 GitHub 变成你的下载代理。"

### 片段 2：测速（20–30 秒）
- 钩子："GitHub 加速镜像别乱用，先测速。"
- 正文：跑 `speedtest-github.sh`，展示 `ghproxy.net 1.19 MB/s` vs 直连超时。
- 收尾："测速脚本在我仓库，收藏。"

### 片段 3：让 CI 下载（30–45 秒）
- 钩子："20.6GB 源码，我让 GitHub Actions 40 分钟下完。"
- 正文：Actions cache 只有 10GB，改用 **Release 分卷**（不限总量）；本地拉回离线编译。
- 收尾："完整脚本和文档，评论区/简介。"

### 抖音简介
```
首次编译 3 天→40 分钟：让 GitHub Actions 当下载代理，Release 分卷缓存，本地离线构建。
仓库：github.com/zishuowang696/embedai
```

---

## 三、GitHub 动作
- Release：`dl-cache` 已就绪（11 分卷）
- README 顶部加一句 + 视频链接
- topics 已设：`yocto kas jetson tegra embedded-linux edge-ai`

## 四、素材清单（录制前）
- [ ] 终端：`speedtest-github.sh` 输出表
- [ ] 终端：`fetch-cache` workflow 运行页（40 分钟、11 分卷）
- [ ] 终端：`pull-dl-cache.sh` 拉取 + `sha256sum -c`
- [ ] 终端：`BB_NO_NETWORK=1 kas build kas.yml` 成功
- [ ] 板子特写：Orin Nano（可选）

## 五、发布顺序（同一天）
1. GitHub：README/Release 更新（锚点）
2. YouTube：长视频 + 1 Short
3. 抖音：3 条片段
4. 三处互链
