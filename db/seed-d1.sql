-- 由 src/scripts/d1-seed.ts 生成：D1 首灌种子（posts/pages/tags/post_tags）
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
  VALUES ('ai-gateway-architecture', '边缘 AI 网关架构拆解：OpenWrt + Jetson 各司其职', '为什么一台路由器 + 一块 Jetson 就是最务实的边缘 AI 网关：转发平面放 OpenWrt，推理平面放 Tegra，用 vlan 与容器串起来。', '<p>很多人把“边缘 AI 网关”想成一个巨大的盒子。实际落地，<strong>一台 OpenWrt 路由器负责转发/策略，一块 Jetson 负责推理</strong>，两者用 VLAN 连起来，往往比单机大盒子更便宜、更易维护。</p>
<h2>1. 分工：转发平面与推理平面分离</h2>
<table><thead><tr><th>设备</th><th>角色</th><th>关键能力</th></tr></thead><tbody><tr><td>OpenWrt 路由器</td><td>转发平面</td><td>NAT、防火墙、QoS、pppoe/4G 拨号</td></tr><tr><td>Jetson Orin</td><td>推理平面</td><td>TensorRT、多路解码、模型常驻</td></tr><tr><td>可选 NUC/小主机</td><td>编排平面</td><td>K8s/K3s 或 docker compose</td></tr></tbody></table>
<p>流量路径：<code>摄像头 → OpenWrt 入站 → 局域网 VLAN10 → Jetson 推理 → 结果回写 / 上云</code>。</p>
<h2>2. OpenWrt 侧：稳定地把流引向 Jetson</h2>
<p>用 <code>uci</code> 配置固定 DHCP 保留与静态路由（假设 Jetson 在 <code>192.168.10.2</code>）：</p>
<pre><code class="language-bash">uci set dhcp.host_jetson=host
uci set dhcp.host_jetson.name=&#39;jetson-orin&#39;
uci set dhcp.host_jetson.ip=&#39;192.168.10.2&#39;
uci set dhcp.host_jetson.mac=&#39;48:B0:2D:xx:xx:xx&#39;
uci commit dhcp
/etc/init.d/dnsmasq restart</code></pre>
<p>在防火墙里只放行需要的端口，避免 Jetson 裸奔到公网：</p>
<pre><code class="language-uci">config rule
	option name &#39;jetson-mqtt&#39;
	option src &#39;lan&#39;
	option dest &#39;wan&#39;
	option dest_ip &#39;203.0.113.10&#39;
	option dest_port &#39;8883&#39;
	option proto &#39;tcp&#39;</code></pre>
<h2>3. Jetson 侧：推理服务常驻</h2>
<p>容器以 <code>restart: unless-stopped</code> 跑，推理结果写回 MQTT/本地 socket：</p>
<pre><code class="language-yaml"># docker-compose.yml
services:
  inference:
    image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2
    runtime: nvidia
    restart: unless-stopped
    volumes:
      - ./engine:/models
    command: [&quot;python&quot;, &quot;/app/serve.py&quot;]</code></pre>
<h2>4. 网关收益：带宽与算力解耦</h2>
<ul><li>OpenWrt 掉线 → 重启路由器，Jetson 推理不受影响。</li><li>Jetson 升级 JetPack → 只动推理平面，转发不中断。</li><li>摄像头数量上来后，在 OpenWrt 上加 QoS，给推理流量保底带宽：</li></ul>
<pre><code class="language-bash"># qos-scripts 示例：把 VLAN10 推理流量标记为高优先级
/etc/init.d/qos enable
uci set qos.eth0.upload=&#39;2Mbit&#39;   # 按实际上行调整
uci commit qos</code></pre>
<h2>小结</h2>
<p>把“网络”和“算力”解耦成两个平面，配合 VLAN 与容器，是我目前验证下来最稳的边缘 AI 网关形态。后续文章会分别深入 OpenWrt QoS 细节与 Jetson 的 TensorRT 多路推理优化。</p>', '---
title: "边缘 AI 网关架构拆解：OpenWrt + Jetson 各司其职"
date: 2026-09-01
tags: ["ai网关", "openwrt", "jetson"]
summary: "为什么一台路由器 + 一块 Jetson 就是最务实的边缘 AI 网关：转发平面放 OpenWrt，推理平面放 Tegra，用 vlan 与容器串起来。"
series: "AI 网关实战"
published: true
---

很多人把“边缘 AI 网关”想成一个巨大的盒子。实际落地，**一台 OpenWrt 路由器负责转发/策略，一块 Jetson 负责推理**，两者用 VLAN 连起来，往往比单机大盒子更便宜、更易维护。

## 1. 分工：转发平面与推理平面分离

| 设备 | 角色 | 关键能力 |
| --- | --- | --- |
| OpenWrt 路由器 | 转发平面 | NAT、防火墙、QoS、pppoe/4G 拨号 |
| Jetson Orin | 推理平面 | TensorRT、多路解码、模型常驻 |
| 可选 NUC/小主机 | 编排平面 | K8s/K3s 或 docker compose |

流量路径：`摄像头 → OpenWrt 入站 → 局域网 VLAN10 → Jetson 推理 → 结果回写 / 上云`。

## 2. OpenWrt 侧：稳定地把流引向 Jetson

用 `uci` 配置固定 DHCP 保留与静态路由（假设 Jetson 在 `192.168.10.2`）：

```bash
uci set dhcp.host_jetson=host
uci set dhcp.host_jetson.name=''jetson-orin''
uci set dhcp.host_jetson.ip=''192.168.10.2''
uci set dhcp.host_jetson.mac=''48:B0:2D:xx:xx:xx''
uci commit dhcp
/etc/init.d/dnsmasq restart
```

在防火墙里只放行需要的端口，避免 Jetson 裸奔到公网：

```uci
config rule
	option name ''jetson-mqtt''
	option src ''lan''
	option dest ''wan''
	option dest_ip ''203.0.113.10''
	option dest_port ''8883''
	option proto ''tcp''
```

## 3. Jetson 侧：推理服务常驻

容器以 `restart: unless-stopped` 跑，推理结果写回 MQTT/本地 socket：

```yaml
# docker-compose.yml
services:
  inference:
    image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2
    runtime: nvidia
    restart: unless-stopped
    volumes:
      - ./engine:/models
    command: ["python", "/app/serve.py"]
```

## 4. 网关收益：带宽与算力解耦

- OpenWrt 掉线 → 重启路由器，Jetson 推理不受影响。
- Jetson 升级 JetPack → 只动推理平面，转发不中断。
- 摄像头数量上来后，在 OpenWrt 上加 QoS，给推理流量保底带宽：

```bash
# qos-scripts 示例：把 VLAN10 推理流量标记为高优先级
/etc/init.d/qos enable
uci set qos.eth0.upload=''2Mbit''   # 按实际上行调整
uci commit qos
```

## 小结

把“网络”和“算力”解耦成两个平面，配合 VLAN 与容器，是我目前验证下来最稳的边缘 AI 网关形态。后续文章会分别深入 OpenWrt QoS 细节与 Jetson 的 TensorRT 多路推理优化。
', 'AI 网关实战', 1, '2026-09-01', '2026-09-06T13:48:36.960Z')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
INSERT INTO tags (name) VALUES ('ai网关') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'ai-gateway-architecture' AND t.name = 'ai网关'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('openwrt') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'ai-gateway-architecture' AND t.name = 'openwrt'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('jetson') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'ai-gateway-architecture' AND t.name = 'jetson'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
  VALUES ('jetson-orin-tensorrt-gateway', 'Jetson Orin 上跑容器化 TensorRT：从交叉编译到刷机落地', '在 NVIDIA Jetson Orin 上用 JetPack 容器做 TensorRT 推理并部署为边缘 AI 网关服务的完整路径，含 jetson-flash 刷机要点。', '<p>NVIDIA Tegra 平台的“嵌入式”和路由器不同：它的亮点是板载 GPU，适合把模型推理下沉到边缘。这篇讲清楚从拿到 Orin 到跑通第一个 TensorRT 程序的三个层次。</p>
<blockquote><p>假设：Jetson Orin Nano 8GB，宿主机 Ubuntu 22.04 x86_64，目标 JetPack 6.0（L4T r36.x）。</p></blockquote>
<h2>0. 三个层次先分清</h2>
<ul><li><strong>BSP / JetPack</strong>：系统 + 驱动 + CUDA/TensorRT，本质还是 Yocto 风格的 L4T 发行版。</li><li><strong>容器化</strong>：JetPack 提供 <code>nvcr.io/nvidia/l4t-*</code> 镜像，避免污染 host。</li><li><strong>交叉编译</strong>：x86 宿主编译 <code>aarch64</code> 目标程序，再拷到板子。</li></ul>
<h2>1. 刷机：使用 SDK Manager 或命令行</h2>
<p>命令行刷写镜像（需要先 <code>download</code> JetPack 压缩包）：</p>
<pre><code class="language-bash">export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit</code></pre>
<p>要点：</p>
<ul><li>USB 线连 Orin 的 <strong>Type-C 恢复口</strong>，按住 Recovery 键上电进入刷机模式。</li><li>刷机前备份：<code>$L4T_DIR/bootloader/system.img</code> 不可直接复制，用 <code>nvbackup</code> 做整机备份。</li></ul>
<h2>2. 部署：把推理服务容器化</h2>
<p>在板子上使用官方容器：</p>
<pre><code class="language-bash"># 需要注册 NVIDIA NGC，获得 nvcr.io 凭据
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt</code></pre>
<h2>3. 暴露给局域网：边缘 AI 网关雏形</h2>
<p>板子上跑一个转发/推理代理（Python + FastAPI 亦可），关键点是<strong>用共享内存或本地 socket 转发 RTSP/HTTP 帧</strong>：</p>
<pre><code class="language-bash"># 简化的“帧 → TensorRT → 结果”pipeline 骨架
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink</code></pre>
<p>完整网关会再叠加 OpenWrt 一侧的 NAT/带宽管理，见系列后续文章。</p>
<h2>小结</h2>
<table><thead><tr><th>环节</th><th>工具</th><th>用途</th></tr></thead><tbody><tr><td>刷系统</td><td>jetson-flash / SDK Manager</td><td>L4T + 驱动</td></tr><tr><td>推理</td><td>l4t-tensorrt 容器</td><td>不污染 host</td></tr><tr><td>部署</td><td>Docker + systemd</td><td>边缘常驻服务</td></tr></tbody></table>', '---
title: "Jetson Orin 上跑容器化 TensorRT：从交叉编译到刷机落地"
date: 2026-08-15
tags: ["jetson", "tegra", "ai网关"]
summary: "在 NVIDIA Jetson Orin 上用 JetPack 容器做 TensorRT 推理并部署为边缘 AI 网关服务的完整路径，含 jetson-flash 刷机要点。"
series: "AI 网关实战"
published: true
---

NVIDIA Tegra 平台的“嵌入式”和路由器不同：它的亮点是板载 GPU，适合把模型推理下沉到边缘。这篇讲清楚从拿到 Orin 到跑通第一个 TensorRT 程序的三个层次。

> 假设：Jetson Orin Nano 8GB，宿主机 Ubuntu 22.04 x86_64，目标 JetPack 6.0（L4T r36.x）。

## 0. 三个层次先分清

- **BSP / JetPack**：系统 + 驱动 + CUDA/TensorRT，本质还是 Yocto 风格的 L4T 发行版。
- **容器化**：JetPack 提供 `nvcr.io/nvidia/l4t-*` 镜像，避免污染 host。
- **交叉编译**：x86 宿主编译 `aarch64` 目标程序，再拷到板子。

## 1. 刷机：使用 SDK Manager 或命令行

命令行刷写镜像（需要先 `download` JetPack 压缩包）：

```bash
export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit
```

要点：

- USB 线连 Orin 的 **Type-C 恢复口**，按住 Recovery 键上电进入刷机模式。
- 刷机前备份：`$L4T_DIR/bootloader/system.img` 不可直接复制，用 `nvbackup` 做整机备份。

## 2. 部署：把推理服务容器化

在板子上使用官方容器：

```bash
# 需要注册 NVIDIA NGC，获得 nvcr.io 凭据
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt
```

## 3. 暴露给局域网：边缘 AI 网关雏形

板子上跑一个转发/推理代理（Python + FastAPI 亦可），关键点是**用共享内存或本地 socket 转发 RTSP/HTTP 帧**：

```bash
# 简化的“帧 → TensorRT → 结果”pipeline 骨架
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink
```

完整网关会再叠加 OpenWrt 一侧的 NAT/带宽管理，见系列后续文章。

## 小结

| 环节 | 工具 | 用途 |
| --- | --- | --- |
| 刷系统 | jetson-flash / SDK Manager | L4T + 驱动 |
| 推理 | l4t-tensorrt 容器 | 不污染 host |
| 部署 | Docker + systemd | 边缘常驻服务 |
', 'AI 网关实战', 1, '2026-08-15', '2026-09-06T13:48:36.965Z')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
INSERT INTO tags (name) VALUES ('jetson') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-orin-tensorrt-gateway' AND t.name = 'jetson'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('tegra') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-orin-tensorrt-gateway' AND t.name = 'tegra'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('ai网关') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-orin-tensorrt-gateway' AND t.name = 'ai网关'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
  VALUES ('openwrt-imagebuilder-quickstart', 'OpenWrt ImageBuilder 快速定制固件：只需几条命令', '用官方 ImageBuilder 给 x86/路由器目标添加软件包并重新打包固件，几分钟内得到可刷写镜像。', '<p>入门 OpenWrt 定制最常见的一个问题是：不想从零编译整个源码树，只想给官方固件加几个包。官方 <strong>ImageBuilder</strong> 就是为此准备的：它只做“打包”，不重新编译内核。</p>
<blockquote><p>假设：主机为 Ubuntu 22.04 / Debian 12，目标设备 <strong>x86_64</strong>，OpenWrt 版本 <strong>23.05.5</strong>。</p></blockquote>
<h2>1. 下载对应目标平台的 ImageBuilder</h2>
<pre><code class="language-bash">cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64</code></pre>
<h2>2. 查看可用的软件包</h2>
<p>ImageBuilder 随附 <code>packages</code> 索引，可直接 <code>grep</code>：</p>
<pre><code class="language-bash">make info | grep -i luci
# 常见：luci luci-ssl-openssl luci-app-* 等</code></pre>
<p>注意：ImageBuilder 只包含与官方源同步的包。若想加入自定义编译的 <code>.ipk</code>，可放到 <code>packages/</code> 目录后再执行 <code>make</code>。</p>
<h2>3. 生成带额外软件包的固件</h2>
<pre><code class="language-bash">make image \
  PROFILE=generic \
  PACKAGES=&quot;luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs&quot;</code></pre>
<p>得到的镜像位于 <code>bin/targets/x86/64/</code>：</p>
<pre><code class="language-text">openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz</code></pre>
<p>刷写前记得：</p>
<pre><code class="language-bash">gzip -dk openwrt-*.img.gz
# x86 目标可先用 qemu 或写盘工具（dd / balenaEtcher）验证</code></pre>
<h2>4. 把自定义包塞进镜像</h2>
<p>自编译的 <code>.ipk</code> 通过 <code>opkg</code> 安装即可，无需重打包：</p>
<pre><code class="language-bash">scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 &quot;opkg install /tmp/mypackage_1.0_1_x86_64.ipk&quot;</code></pre>
<h2>小结</h2>
<table><thead><tr><th>场景</th><th>推荐工具</th></tr></thead><tbody><tr><td>只加官方包、快速打包</td><td>ImageBuilder</td></tr><tr><td>深度定制内核/驱动</td><td>源码编译（SDK）</td></tr><tr><td>日常装软件</td><td>opkg 在线安装</td></tr></tbody></table>
<p>下一篇会讲源码编译时如何用 <code>menuconfig</code> 裁剪内核。</p>', '---
title: "OpenWrt ImageBuilder 快速定制固件：只需几条命令"
date: 2026-07-10
tags: ["openwrt", "固件编译"]
summary: "用官方 ImageBuilder 给 x86/路由器目标添加软件包并重新打包固件，几分钟内得到可刷写镜像。"
series: "OpenWrt 编译入门"
published: true
---

入门 OpenWrt 定制最常见的一个问题是：不想从零编译整个源码树，只想给官方固件加几个包。官方 **ImageBuilder** 就是为此准备的：它只做“打包”，不重新编译内核。

> 假设：主机为 Ubuntu 22.04 / Debian 12，目标设备 **x86_64**，OpenWrt 版本 **23.05.5**。

## 1. 下载对应目标平台的 ImageBuilder

```bash
cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64
```

## 2. 查看可用的软件包

ImageBuilder 随附 `packages` 索引，可直接 `grep`：

```bash
make info | grep -i luci
# 常见：luci luci-ssl-openssl luci-app-* 等
```

注意：ImageBuilder 只包含与官方源同步的包。若想加入自定义编译的 `.ipk`，可放到 `packages/` 目录后再执行 `make`。

## 3. 生成带额外软件包的固件

```bash
make image \
  PROFILE=generic \
  PACKAGES="luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs"
```

得到的镜像位于 `bin/targets/x86/64/`：

```text
openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz
```

刷写前记得：

```bash
gzip -dk openwrt-*.img.gz
# x86 目标可先用 qemu 或写盘工具（dd / balenaEtcher）验证
```

## 4. 把自定义包塞进镜像

自编译的 `.ipk` 通过 `opkg` 安装即可，无需重打包：

```bash
scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "opkg install /tmp/mypackage_1.0_1_x86_64.ipk"
```

## 小结

| 场景 | 推荐工具 |
| --- | --- |
| 只加官方包、快速打包 | ImageBuilder |
| 深度定制内核/驱动 | 源码编译（SDK） |
| 日常装软件 | opkg 在线安装 |

下一篇会讲源码编译时如何用 `menuconfig` 裁剪内核。
', 'OpenWrt 编译入门', 1, '2026-07-10', '2026-09-06T13:48:36.966Z')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
INSERT INTO tags (name) VALUES ('openwrt') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'openwrt-imagebuilder-quickstart' AND t.name = 'openwrt'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('固件编译') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'openwrt-imagebuilder-quickstart' AND t.name = '固件编译'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at)
  VALUES ('yocto-recipe-hello', 'Yocto 第一个 BitBake recipe：meta- 层里的 Hello World', '手把手创建自定义 layer 与最小 recipe，并在 QEMU 镜像里安装自己编译的程序，理解 SRC_URI / S / do_compile。', '<p>Yocto 用 <strong>recipe</strong>（<code>.bb</code>）描述“怎么把一个源码变成安装包”。这篇用一个最小示例走通整条链路：自建 layer → recipe → 编译 → 进入镜像。</p>
<blockquote><p>假设：<code>poky</code> 已 <code>git clone</code> 到 <code>~/poky</code>，分支 <code>kirkstone</code>（LTS）。主机 Ubuntu 22.04。</p></blockquote>
<h2>1. 结构：先有 layer</h2>
<pre><code class="language-bash">cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer</code></pre>
<p>生成的 <code>meta-mylayer</code> 自带一个示例 <code>recipes-example/example/example_0.1.bb</code>。真正的 layer 长这样：</p>
<pre><code class="language-text">meta-mylayer/
├── conf/layer.conf
└── recipes-example/
    ├── example/example_0.1.bb
    └── myhello/
        ├── myhello_0.1.bb
        └── files/
            └── myhello.c</code></pre>
<h2>2. 一个普通 C 程序 recipe</h2>
<p><code>myhello.c</code> 内容略（打印 <code>hello from yocto</code>）。recipe：</p>
<pre><code class="language-bitbake">SUMMARY = &quot;Minimal hello program&quot;
LICENSE = &quot;MIT&quot;
LIC_FILES_CHKSUM = &quot;file://${COMMON_LICENSE_DIR}/MIT;md5=... &quot;

SRC_URI = &quot;file://myhello.c&quot;
S = &quot;${WORKDIR}/sources&quot;
UNPACKDIR = &quot;${S}&quot;   # kirkstone 后解包目录

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig</code></pre>
<h2>3. 只编译单个 recipe</h2>
<pre><code class="language-bash">bitbake myhello</code></pre>
<p>产物在：</p>
<pre><code class="language-bash">find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello</code></pre>
<h2>4. 塞进镜像并在 QEMU 里运行</h2>
<pre><code class="language-bash"># 加入本地目标机器的镜像
echo &#39;IMAGE_INSTALL:append = &quot; myhello&quot;&#39; &gt;&gt; conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64</code></pre>
<p>进入系统后：</p>
<pre><code class="language-bash">root@qemux86-64:~# myhello
hello from yocto</code></pre>
<h2>常见坑</h2>
<ul><li>改了源码没生效：检查 <code>do_compile</code> 是否有旧缓存，必要时 <code>bitbake -c cleansstate myhello</code>。</li><li><code>md5=</code> 校验和：用 <code>sha256sum</code> 得到文件哈希后替换。</li><li>需要调试变量：<code>bitbake -e myhello | grep ^S=</code>。</li></ul>
<p>下一篇介绍 layer 优先级与 <code>.bbappend</code> 覆盖官方 recipe。</p>', '---
title: "Yocto 第一个 BitBake recipe：meta- 层里的 Hello World"
date: 2026-08-01
tags: ["yocto", "bitbake"]
summary: "手把手创建自定义 layer 与最小 recipe，并在 QEMU 镜像里安装自己编译的程序，理解 SRC_URI / S / do_compile。"
series: "Yocto 构建系统笔记"
published: true
---

Yocto 用 **recipe**（`.bb`）描述“怎么把一个源码变成安装包”。这篇用一个最小示例走通整条链路：自建 layer → recipe → 编译 → 进入镜像。

> 假设：`poky` 已 `git clone` 到 `~/poky`，分支 `kirkstone`（LTS）。主机 Ubuntu 22.04。

## 1. 结构：先有 layer

```bash
cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer
```

生成的 `meta-mylayer` 自带一个示例 `recipes-example/example/example_0.1.bb`。真正的 layer 长这样：

```text
meta-mylayer/
├── conf/layer.conf
└── recipes-example/
    ├── example/example_0.1.bb
    └── myhello/
        ├── myhello_0.1.bb
        └── files/
            └── myhello.c
```

## 2. 一个普通 C 程序 recipe

`myhello.c` 内容略（打印 `hello from yocto`）。recipe：

```bitbake
SUMMARY = "Minimal hello program"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=... "

SRC_URI = "file://myhello.c"
S = "${WORKDIR}/sources"
UNPACKDIR = "${S}"   # kirkstone 后解包目录

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig
```

## 3. 只编译单个 recipe

```bash
bitbake myhello
```

产物在：

```bash
find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello
```

## 4. 塞进镜像并在 QEMU 里运行

```bash
# 加入本地目标机器的镜像
echo ''IMAGE_INSTALL:append = " myhello"'' >> conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64
```

进入系统后：

```bash
root@qemux86-64:~# myhello
hello from yocto
```

## 常见坑

- 改了源码没生效：检查 `do_compile` 是否有旧缓存，必要时 `bitbake -c cleansstate myhello`。
- `md5=` 校验和：用 `sha256sum` 得到文件哈希后替换。
- 需要调试变量：`bitbake -e myhello | grep ^S=`。

下一篇介绍 layer 优先级与 `.bbappend` 覆盖官方 recipe。
', 'Yocto 构建系统笔记', 1, '2026-08-01', '2026-09-06T13:48:36.967Z')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-recipe-hello' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('bitbake') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-recipe-hello' AND t.name = 'bitbake'
  ON CONFLICT DO NOTHING;
INSERT INTO pages (slug, title, content_html, source_md, created_at, updated_at)
  VALUES ('about', '关于本站', '<p>这是一个记录 <strong>OpenWrt / Yocto / NVIDIA Tegra（Jetson）</strong> 嵌入式开发学习过程的个人博客，重点方向是这些硬件平台上的 <strong>边缘 AI 网关</strong> 实践。</p>
<h2>写作原则</h2>
<ul><li>命令与配置尽量<strong>真实可复现</strong>，并标注目标设备与软件版本假设。</li><li>文章即笔记：跟着我一起踩坑、编译、刷机、调优。</li><li>专有名词保留英文，正文以中文为主。</li></ul>
<h2>技术栈</h2>
<p>本站本身也是一次“轻量嵌入式网站”的练习：</p>
<ul><li><strong>Bun</strong> 运行时</li><li><strong>Hono</strong> Web 框架（SSR 输出 HTML）</li><li><strong>htmx</strong> 做局部片段交互</li><li><strong>SQLite</strong> 单文件数据库</li><li>Markdown 写内容，启动时渲染入库</li></ul>
<blockquote><p>注册账号即可在文章下评论；想协作/指正也欢迎留言。</p></blockquote>', '---
title: "关于本站"
date: 2026-09-01
---

这是一个记录 **OpenWrt / Yocto / NVIDIA Tegra（Jetson）** 嵌入式开发学习过程的个人博客，重点方向是这些硬件平台上的 **边缘 AI 网关** 实践。

## 写作原则

- 命令与配置尽量**真实可复现**，并标注目标设备与软件版本假设。
- 文章即笔记：跟着我一起踩坑、编译、刷机、调优。
- 专有名词保留英文，正文以中文为主。

## 技术栈

本站本身也是一次“轻量嵌入式网站”的练习：

- **Bun** 运行时
- **Hono** Web 框架（SSR 输出 HTML）
- **htmx** 做局部片段交互
- **SQLite** 单文件数据库
- Markdown 写内容，启动时渲染入库

> 注册账号即可在文章下评论；想协作/指正也欢迎留言。
', '2026-09-01', '2026-09-06T13:48:36.967Z')
  ON CONFLICT(slug) DO UPDATE SET title = excluded.title, content_html = excluded.content_html, source_md = excluded.source_md, updated_at = excluded.updated_at;
