---
title: "边缘 AI 网关架构拆解：OpenWrt + Jetson 各司其职"
date: 2026-09-01
tags: [ai网关, openwrt, jetson]
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
uci set dhcp.host_jetson.name='jetson-orin'
uci set dhcp.host_jetson.ip='192.168.10.2'
uci set dhcp.host_jetson.mac='48:B0:2D:xx:xx:xx'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

在防火墙里只放行需要的端口，避免 Jetson 裸奔到公网：

```uci
config rule
	option name 'jetson-mqtt'
	option src 'lan'
	option dest 'wan'
	option dest_ip '203.0.113.10'
	option dest_port '8883'
	option proto 'tcp'
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
uci set qos.eth0.upload='2Mbit'   # 按实际上行调整
uci commit qos
```

## 小结

把“网络”和“算力”解耦成两个平面，配合 VLAN 与容器，是我目前验证下来最稳的边缘 AI 网关形态。后续文章会分别深入 OpenWrt QoS 细节与 Jetson 的 TensorRT 多路推理优化。
