# 选题 backlog（10 期主系列 + 抖音快剪）

主系列：**Building & Maintaining a Jetson Linux Distro / 从零维护 Jetson 发行版**
每期三平台同步；英文走 GitHub + YouTube，中文走抖音（长版可发 B 站备用）。

## 10 期主系列

| # | 主题 | GitHub 动作 | YouTube（英文） | 抖音钩子（中文） | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | 为什么从 git submodule 迁到 KAS | Release + README 更新 | "Why I dropped submodules for KAS" | "Yocto 多仓库管理，别再手动 submodule 了" | 脚本已备 |
| 2 | 一个 kas.yml 锁死整棵构建树 | 加 `kas.yml` 说明 + badge | "One file to pin your whole Yocto tree" | "Yocto 版本老漂移？一个文件锁死" | 待办 |
| 3 | 解剖 meta-embedai：distro / image / TF-A | 仓库结构图 | "Inside my custom Yocto layer" | "自建 Yocto 层该放什么" | 待办 |
| 4 | Orin Nano NVMe 镜像：构建到刷机 | Release 镜像说明 | "Build & flash a Jetson Orin Nano NVMe image" | "Jetson 刷机最容易废的一块" | 待办（爆款位） |
| 5 | 内核裁剪与镜像瘦身 | defconfig/bbappend | "Shrink your Jetson image" | "镜像大 3 倍？内核裁剪 5 分钟" | 待办 |
| 6 | U-Boot / TF-A 启动链定制 | recipes-bsp 更新 | "Customizing the Jetson boot chain" | "Jetson 起不来？先看启动链" | 待办 |
| 7 | 把 TensorRT 容器带进发行版 | meta-virtualization 配置 | "Ship TensorRT containers in your distro" | "Jetson 上跑 TensorRT，别污染系统" | 待办 |
| 8 | OTA / A-B 升级策略 | 方案文档 | "OTA updates for embedded Linux" | "设备怎么远程升级不砖" | 待办 |
| 9 | 构建缓存与 CI（sstate + Actions） | GitHub Actions | "Make Yocto builds fast with sstate + CI" | "Yocto 编译提速 10 倍" | 待办 |
| 10 | 边缘 AI 网关：Jetson 推理 + OpenWrt 转发 | 新仓库/示例 | "Edge AI gateway: Jetson + OpenWrt" | "一台路由器+一块 Jetson 就是 AI 网关" | 待办 |

## 抖音快剪（不需长视频，15–40 秒）
- "Jetson 刷机前必须备份的 3 个东西"
- "Yocto 编译报错，先查这 3 个变量"
- "KAS 是什么，30 秒讲清"
- "meta-tegra 和官方 BSP 差在哪"
- "为什么嵌入式工程师都该会点 Yocto"
- "Jetson Orin Nano 值不值得买（做边缘 AI）"
- "TF-A / U-Boot / Kernel 启动顺序 20 秒版"
- "设备树改了不生效？99% 是这原因"

## 选题来源
- GitHub Issues / Discussions 里观众的问题
- YouTube / 抖音评论区高频问题
- 自己维护 `embedai` 时踩到的真实坑（最高价值）
