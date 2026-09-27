# 单期素材包：把 30GB 编译缓存塞进 GitHub Release（邪修）

- 定位：**引流短内容**（抖音快剪 + GitHub/README 长尾），挂在"AI 网关发行版"主题下。
- 一句话：GitHub Actions 缓存每仓库只有 10GB，我把 15–30GB 的 Yocto sstate 缓存改存进 **Release**。
- 目标观众：被"Yocto/GitHub Actions 每次从零重编"折磨的人。

---

## 1. 抖音短脚本（中文，20–40 秒）

**钩子（0–3s，画面：CI 日志刷屏 / "Running task 3000/8043"）**
> Yocto 编译十小时？不是 CPU 慢，是**缓存根本没存上**。

**展开（3–18s，画面：Actions 设置页 / 10GB 字样）**
> GitHub Actions 的缓存，**每个仓库只有 10GB**。
> 我的编译缓存有 **15GB 起**，一存就超，**静默失败** → 所以你每次都在**从头编**。

**邪修（18–30s，画面：Release 页面，8 卷 sstate.part-*）**
> 我换了个地方存——**GitHub Release**：单文件<2GB、总量不限。
> 分卷 1.9GB，**CI 内网拉 15GB 只要 3 分钟**。

**收尾 + CTA（30–40s，画面：增量构建日志 / 命令行）**
> 再配上脚本：一行拉回本地，**从零几小时 → 增量几分钟**。
> 代码开源在 GitHub，搜索「embedai」。

**字幕关键词**：#Yocto #GitHubActions #嵌入式 #编译提速

---

## 2. YouTube / 英文（标题 + 描述）

**标题（三选一）**
1. `GitHub Actions cache is 10GB — so I cached 30GB of Yocto artifacts in Releases`
2. `I put a 30GB Yocto sstate cache in GitHub Releases`
3. `Make Yocto builds fast: sstate cache in GitHub Releases (no 10GB cap)`

**描述**
> GitHub Actions cache is capped at 10GB per repo. My Yocto sstate cache is 15–30GB, so `actions/cache` silently failed and every run rebuilt from scratch.
> This is how I persist the sstate cache in **GitHub Releases** instead (per-asset <2GiB, unlimited total): split into 1.9GB parts, versioned sets, atomic `LATEST` pointer, checksummed restore. 15GB restore = ~3 min inside CI.
> Repo: embedai — building an edge-AI Linux distro for Jetson Orin Nano.

---

## 3. 仓库 README 片段（可粘贴）

### 中文（加到 `README.md`「构建方式」之后）

```markdown
### CI 构建缓存：sstate 存进 Release（突破 Actions 10GB）

GitHub Actions 的缓存**每仓库上限 10GB**，而本项目的 Yocto `sstate` 缓存有 15–30GB——
用 `actions/cache` 必然超限、save 静默失败，导致 CI **每次从零重编**。

改用 **GitHub Release** 持久化（单文件 <2GiB、每 release ≤1000 资产、总大小不限）：

- CI 编译产物按 **1.9GB 分卷**上传到 Release（`sstate-jetson` / `sstate-qemu`）；
- **版本化、非覆盖**：先传完整套，最后原子切换 `LATEST` 指针 → 中断也不会丢旧缓存；
- 还原时读 `LATEST` → 下载该套 → `sha256sum -c` 校验 → 解压进 `build/sstate-cache`；
- CI 内网拉取 15GB 约 **3 分钟**。

本地复用（可选，慢网慎用）：

```bash
scripts/pull-sstate.sh          # 拉 sstate-jetson → build/sstate-cache
scripts/pull-sstate.sh qemu     # 拉 sstate-qemu（qemuarm64）
```

> 原则：**CI 编全量、本地只增量**。详见 [docs/17-dev-loop.md](docs/17-dev-loop.md)。
```

### English（加到 `README.en.md`）

```markdown
### CI cache: persist sstate in GitHub Releases (bypassing the 10GB Actions cap)

GitHub Actions cache is capped at **10GB per repo**, while this project's Yocto
`sstate` cache is 15–30GB — so `actions/cache` always exceeded the limit and the
save failed silently, forcing a **from-scratch rebuild on every run**.

We persist it in a **GitHub Release** instead (per-asset <2GiB, ≤1000 assets,
unlimited total size): 1.9GB parts, versioned sets, an atomic `LATEST` pointer so
an interrupted upload never loses the previous cache, and a checksummed restore
into `build/sstate-cache`. A 15GB restore takes ~3 min inside CI.
```

---

## 4. 可复制的事实/数字（发帖引用）

- Actions cache 上限：**10GB / 仓库**（7 天不用会清）
- Release 限制：单文件 **<2GiB**、每 release **≤1000 资产**、**总量/流量不限**
- 实测：CI 内网拉 **15GB ≈ 3 分钟**；分卷 1.9GB；`sstate-jetson` 8 卷 ≈ 15.25GB
- 本机从零全量：4 核 ≈ **10h+**；增量（命中 sstate）= **分钟级**
