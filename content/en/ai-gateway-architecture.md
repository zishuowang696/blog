---
title: "Edge AI Gateway Architecture: OpenWrt + Jetson, Each in Its Lane"
summary: "Why one router plus one Jetson is the most pragmatic edge AI gateway: OpenWrt owns the forwarding plane, Tegra owns inference, wired together with VLANs and containers."
---

Many people picture an "edge AI gateway" as one giant box. In practice, **one OpenWrt router handling forwarding/policy plus one Jetson handling inference**, connected over VLAN, is often cheaper and easier to maintain than a single big device.

## 1. Division of labor: forwarding plane vs inference plane

| Device | Role | Key capabilities |
| --- | --- | --- |
| OpenWrt router | Forwarding plane | NAT, firewall, QoS, pppoe/4G dial-up |
| Jetson Orin | Inference plane | TensorRT, multi-stream decode, resident models |
| Optional NUC/mini PC | Orchestration plane | K8s/K3s or docker compose |

Traffic path: `camera → OpenWrt ingress → LAN VLAN10 → Jetson inference → results written back / to cloud`.

## 2. OpenWrt side: reliably steer streams to Jetson

Use `uci` to set a static DHCP reservation and routing (assume Jetson is on `192.168.10.2`):

```bash
uci set dhcp.host_jetson=host
uci set dhcp.host_jetson.name='jetson-orin'
uci set dhcp.host_jetson.ip='192.168.10.2'
uci set dhcp.host_jetson.mac='48:B0:2D:xx:xx:xx'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

In the firewall, only allow the ports you need so the Jetson is never exposed to the internet:

```uci
config rule
	option name 'jetson-mqtt'
	option src 'lan'
	option dest 'wan'
	option dest_ip '203.0.113.10'
	option dest_port '8883'
	option proto 'tcp'
```

## 3. Jetson side: an always-on inference service

Run the container with `restart: unless-stopped` and write results back over MQTT/local socket:

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

## 4. The payoff: decoupling bandwidth from compute

- OpenWrt drops? Restart the router; Jetson inference is unaffected.
- Jetson needs a JetPack upgrade? Only the inference plane changes; forwarding keeps running.
- As cameras grow, add QoS on OpenWrt to guarantee inference traffic a bandwidth floor:

```bash
# qos-scripts example: mark VLAN10 inference traffic high priority
/etc/init.d/qos enable
uci set qos.eth0.upload='2Mbit'   # adjust to your real uplink
uci commit qos
```

## Wrap-up

Decoupling "network" from "compute" into two planes with VLANs and containers is the most stable edge AI gateway shape I've validated so far. Later posts will dig into OpenWrt QoS details and multi-stream TensorRT tuning on Jetson.
