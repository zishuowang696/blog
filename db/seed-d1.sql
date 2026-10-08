-- 由 src/scripts/d1-seed.ts 生成：D1 首灌种子（posts/pages/tags/post_tags）
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
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
', 'AI 网关实战', 1, '2026-09-01', '2026-10-08T22:38:26.709Z', 'Edge AI Gateway Architecture: OpenWrt + Jetson, Each in Its Lane', 'Why one router plus one Jetson is the most pragmatic edge AI gateway: OpenWrt owns the forwarding plane, Tegra owns inference, wired together with VLANs and containers.', 'Many people picture an "edge AI gateway" as one giant box. In practice, **one OpenWrt router handling forwarding/policy plus one Jetson handling inference**, connected over VLAN, is often cheaper and easier to maintain than a single big device.

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
uci set dhcp.host_jetson.name=''jetson-orin''
uci set dhcp.host_jetson.ip=''192.168.10.2''
uci set dhcp.host_jetson.mac=''48:B0:2D:xx:xx:xx''
uci commit dhcp
/etc/init.d/dnsmasq restart
```

In the firewall, only allow the ports you need so the Jetson is never exposed to the internet:

```uci
config rule
	option name ''jetson-mqtt''
	option src ''lan''
	option dest ''wan''
	option dest_ip ''203.0.113.10''
	option dest_port ''8883''
	option proto ''tcp''
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
uci set qos.eth0.upload=''2Mbit''   # adjust to your real uplink
uci commit qos
```

## Wrap-up

Decoupling "network" from "compute" into two planes with VLANs and containers is the most stable edge AI gateway shape I''ve validated so far. Later posts will dig into OpenWrt QoS details and multi-stream TensorRT tuning on Jetson.
', '<p>Many people picture an &quot;edge AI gateway&quot; as one giant box. In practice, <strong>one OpenWrt router handling forwarding/policy plus one Jetson handling inference</strong>, connected over VLAN, is often cheaper and easier to maintain than a single big device.</p>
<h2>1. Division of labor: forwarding plane vs inference plane</h2>
<table><thead><tr><th>Device</th><th>Role</th><th>Key capabilities</th></tr></thead><tbody><tr><td>OpenWrt router</td><td>Forwarding plane</td><td>NAT, firewall, QoS, pppoe/4G dial-up</td></tr><tr><td>Jetson Orin</td><td>Inference plane</td><td>TensorRT, multi-stream decode, resident models</td></tr><tr><td>Optional NUC/mini PC</td><td>Orchestration plane</td><td>K8s/K3s or docker compose</td></tr></tbody></table>
<p>Traffic path: <code>camera → OpenWrt ingress → LAN VLAN10 → Jetson inference → results written back / to cloud</code>.</p>
<h2>2. OpenWrt side: reliably steer streams to Jetson</h2>
<p>Use <code>uci</code> to set a static DHCP reservation and routing (assume Jetson is on <code>192.168.10.2</code>):</p>
<pre><code class="language-bash">uci set dhcp.host_jetson=host
uci set dhcp.host_jetson.name=&#39;jetson-orin&#39;
uci set dhcp.host_jetson.ip=&#39;192.168.10.2&#39;
uci set dhcp.host_jetson.mac=&#39;48:B0:2D:xx:xx:xx&#39;
uci commit dhcp
/etc/init.d/dnsmasq restart</code></pre>
<p>In the firewall, only allow the ports you need so the Jetson is never exposed to the internet:</p>
<pre><code class="language-uci">config rule
	option name &#39;jetson-mqtt&#39;
	option src &#39;lan&#39;
	option dest &#39;wan&#39;
	option dest_ip &#39;203.0.113.10&#39;
	option dest_port &#39;8883&#39;
	option proto &#39;tcp&#39;</code></pre>
<h2>3. Jetson side: an always-on inference service</h2>
<p>Run the container with <code>restart: unless-stopped</code> and write results back over MQTT/local socket:</p>
<pre><code class="language-yaml"># docker-compose.yml
services:
  inference:
    image: nvcr.io/nvidia/l4t-tensorrt:r8.6.2
    runtime: nvidia
    restart: unless-stopped
    volumes:
      - ./engine:/models
    command: [&quot;python&quot;, &quot;/app/serve.py&quot;]</code></pre>
<h2>4. The payoff: decoupling bandwidth from compute</h2>
<ul><li>OpenWrt drops? Restart the router; Jetson inference is unaffected.</li><li>Jetson needs a JetPack upgrade? Only the inference plane changes; forwarding keeps running.</li><li>As cameras grow, add QoS on OpenWrt to guarantee inference traffic a bandwidth floor:</li></ul>
<pre><code class="language-bash"># qos-scripts example: mark VLAN10 inference traffic high priority
/etc/init.d/qos enable
uci set qos.eth0.upload=&#39;2Mbit&#39;   # adjust to your real uplink
uci commit qos</code></pre>
<h2>Wrap-up</h2>
<p>Decoupling &quot;network&quot; from &quot;compute&quot; into two planes with VLANs and containers is the most stable edge AI gateway shape I&#39;ve validated so far. Later posts will dig into OpenWrt QoS details and multi-stream TensorRT tuning on Jetson.</p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
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
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('build-ai-agent-from-scratch', '从 0 构建一个 AI Agent：核心其实只有 20 行', '抛开所有框架，Agent 的本质是一个循环 + 一组工具。看懂这段 20 行的骨架，你就掌握了所有 Agent 框架的内核。', '<p>市面上的 Agent 框架层出不穷，容易让人以为里面有什么高深的东西。<strong>其实没有</strong>：剥掉包装，Agent 的本质就是下面这 20 行。</p>
<h2>核心：一个循环</h2>
<pre><code class="language-python">import json

TOOLS = {
    &quot;get_temp&quot;: lambda: {&quot;temp&quot;: 42},        # 你的真实函数
}

def agent(user_input):
    messages = [{&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: user_input}]
    while True:
        reply = llm(messages, tools=TOOLS)   # 1. 问模型
        messages.append(reply)
        if not reply.get(&quot;tool_calls&quot;):      # 2. 不用工具了 → 给答案
            return reply[&quot;content&quot;]
        for call in reply[&quot;tool_calls&quot;]:     # 3. 真正执行工具
            result = TOOLS[call[&quot;name&quot;]]()
            messages.append({&quot;role&quot;: &quot;tool&quot;, &quot;content&quot;: json.dumps(result)})</code></pre>
<p>每一次循环只做三件事：<strong>问模型 → 执行它要的工具 → 把结果塞回去</strong>，直到模型给出最终答案。</p>
<p>所有&quot;框架&quot;——LangChain、AutoGen、你见过的任何一个——<strong>都只是把这 20 行包得更顺手</strong>：加日志、加记忆、加并发、加 UI。内核没变。</p>
<p>理解了这一点，剩下的四个概念就都好懂了。</p>
<h2>一、工具调用：模型决定，你的代码执行</h2>
<p>模型本身只会&quot;说话&quot;，不会&quot;做事&quot;。<strong>工具调用</strong>就是把&quot;做事的能力&quot;交给它：</p>
<ul><li>你把函数<strong>名字和参数</strong>告诉模型；</li><li>模型决定<strong>调哪个、传什么</strong>；</li><li><strong>你的代码去真正执行</strong>，把结果回喂。</li></ul>
<p>关键在这句：<strong>模型不执行任何东西</strong>，它只输出&quot;我想调 <code>get_temp()</code>&quot;。<strong>真正动手的永远是你的代码</strong>——这既是安全边界（你能拦、能审），也是为什么&quot;给模型一双干净的手&quot;比&quot;给它一百个工具&quot;更重要。</p>
<blockquote><p>工具别贪多。<strong>先给 3 个真用得上的</strong>。</p></blockquote>
<h2>二、记忆：短期靠拼，长期靠检索</h2>
<p>模型<strong>没有记忆</strong>——每次调用都是&quot;新人&quot;。所谓 Agent 的&quot;记忆&quot;，只是你<strong>主动喂给它的上下文</strong>：</p>
<ul><li><strong>短期</strong>：把对话历史拼进 prompt。简单，但越拼越长、越贵。</li><li><strong>长期</strong>：把要点存进<strong>向量库</strong>，需要时<strong>检索</strong>回来。省 token，且能无限扩展。</li></ul>
<p><strong>先做短期</strong>，等到量大或要跨会话回忆，再上长期。</p>
<p>记住一句话：<strong>记忆不是&quot;存下来&quot;，而是&quot;下次能取出来&quot;。</strong></p>
<h2>三、可观测：Agent 的调试就是&quot;看轨迹&quot;</h2>
<p>模型是<strong>不确定</strong>的：同样的输入，可能走完全不同的路径。所以你<strong>看不到它每一步在干嘛，就根本没法调</strong>。</p>
<p>至少要能看见：每一轮<strong>模型的决定</strong>、每一次<strong>工具调用</strong>的参数与结果、以及<strong>时间和失败</strong>卡在哪里。</p>
<blockquote><p><strong>Agent 调试的本质，是读它的执行轨迹。</strong></p></blockquote>
<h2>四、本地模型：离线、私有、能上边缘</h2>
<p>Agent 不一定要用云模型。用 <strong>Ollama</strong> 在本地跑：<strong>免费、离线、数据不出场</strong>——而且能跑在<strong>边缘设备</strong>上（Jetson 这类板子也能撑起小模型）。</p>
<p>主流框架都支持它的统一接口，把 <code>base_url</code> 指到本地即可。</p>
<p>一个经验：<strong>小模型的工具调用能力弱</strong>。所以顺序是——<strong>先用强模型把循环跑通，再换小模型做优化</strong>。</p>
<h2>下一步：把它变成&quot;你的&quot; Agent</h2>
<p>看懂这 20 行之后，你只需要做一件事：<strong>给它加一个你自己的工具</strong>。</p>
<p>比如加一个 <code>get_device_temp()</code>——读板子温度的普通函数。当模型学会&quot;先看温度、再决定要不要降频&quot;时，你就已经迈出了<strong>设备自运维 Agent</strong> 的第一步。</p>
<hr>
<p><strong>一句话收尾</strong>：Agent = <strong>一个循环 + 一组工具</strong>；记忆让它记得住，可观测让它调得动，本地模型让它跑得起。<strong>框架会变，这个内核不会。</strong></p>', '---
title: "从 0 构建一个 AI Agent：核心其实只有 20 行"
date: 2026-09-30
tags: ["ai-agent", "智能体", "教程", "function-calling", "ollama"]
summary: "抛开所有框架，Agent 的本质是一个循环 + 一组工具。看懂这段 20 行的骨架，你就掌握了所有 Agent 框架的内核。"
series: "从 0 构建 AI Agent"
published: true
---

市面上的 Agent 框架层出不穷，容易让人以为里面有什么高深的东西。**其实没有**：剥掉包装，Agent 的本质就是下面这 20 行。

## 核心：一个循环

```python
import json

TOOLS = {
    "get_temp": lambda: {"temp": 42},        # 你的真实函数
}

def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        reply = llm(messages, tools=TOOLS)   # 1. 问模型
        messages.append(reply)
        if not reply.get("tool_calls"):      # 2. 不用工具了 → 给答案
            return reply["content"]
        for call in reply["tool_calls"]:     # 3. 真正执行工具
            result = TOOLS[call["name"]]()
            messages.append({"role": "tool", "content": json.dumps(result)})
```

每一次循环只做三件事：**问模型 → 执行它要的工具 → 把结果塞回去**，直到模型给出最终答案。

所有"框架"——LangChain、AutoGen、你见过的任何一个——**都只是把这 20 行包得更顺手**：加日志、加记忆、加并发、加 UI。内核没变。

理解了这一点，剩下的四个概念就都好懂了。

## 一、工具调用：模型决定，你的代码执行

模型本身只会"说话"，不会"做事"。**工具调用**就是把"做事的能力"交给它：

- 你把函数**名字和参数**告诉模型；
- 模型决定**调哪个、传什么**；
- **你的代码去真正执行**，把结果回喂。

关键在这句：**模型不执行任何东西**，它只输出"我想调 `get_temp()`"。**真正动手的永远是你的代码**——这既是安全边界（你能拦、能审），也是为什么"给模型一双干净的手"比"给它一百个工具"更重要。

> 工具别贪多。**先给 3 个真用得上的**。

## 二、记忆：短期靠拼，长期靠检索

模型**没有记忆**——每次调用都是"新人"。所谓 Agent 的"记忆"，只是你**主动喂给它的上下文**：

- **短期**：把对话历史拼进 prompt。简单，但越拼越长、越贵。
- **长期**：把要点存进**向量库**，需要时**检索**回来。省 token，且能无限扩展。

**先做短期**，等到量大或要跨会话回忆，再上长期。

记住一句话：**记忆不是"存下来"，而是"下次能取出来"。**

## 三、可观测：Agent 的调试就是"看轨迹"

模型是**不确定**的：同样的输入，可能走完全不同的路径。所以你**看不到它每一步在干嘛，就根本没法调**。

至少要能看见：每一轮**模型的决定**、每一次**工具调用**的参数与结果、以及**时间和失败**卡在哪里。

> **Agent 调试的本质，是读它的执行轨迹。**

## 四、本地模型：离线、私有、能上边缘

Agent 不一定要用云模型。用 **Ollama** 在本地跑：**免费、离线、数据不出场**——而且能跑在**边缘设备**上（Jetson 这类板子也能撑起小模型）。

主流框架都支持它的统一接口，把 `base_url` 指到本地即可。

一个经验：**小模型的工具调用能力弱**。所以顺序是——**先用强模型把循环跑通，再换小模型做优化**。

## 下一步：把它变成"你的" Agent

看懂这 20 行之后，你只需要做一件事：**给它加一个你自己的工具**。

比如加一个 `get_device_temp()`——读板子温度的普通函数。当模型学会"先看温度、再决定要不要降频"时，你就已经迈出了**设备自运维 Agent** 的第一步。

---

**一句话收尾**：Agent = **一个循环 + 一组工具**；记忆让它记得住，可观测让它调得动，本地模型让它跑得起。**框架会变，这个内核不会。**
', '从 0 构建 AI Agent', 1, '2026-09-30', '2026-10-08T22:38:26.711Z', 'Building an AI agent from scratch: the core is 20 lines', 'Strip away the frameworks and an agent is a loop plus a set of tools. Understand this 20-line skeleton and you understand the kernel of every agent framework.', 'New agent frameworks appear every month, which makes it easy to assume there''s something deep inside. **There isn''t.** Strip away the packaging and an agent is the 20 lines below.

## The core: a loop

```python
import json

TOOLS = {
    "get_temp": lambda: {"temp": 42},        # your real function
}

def agent(user_input):
    messages = [{"role": "user", "content": user_input}]
    while True:
        reply = llm(messages, tools=TOOLS)   # 1. ask the model
        messages.append(reply)
        if not reply.get("tool_calls"):      # 2. no tool needed -> answer
            return reply["content"]
        for call in reply["tool_calls"]:     # 3. actually run the tools
            result = TOOLS[call["name"]]()
            messages.append({"role": "tool", "content": json.dumps(result)})
```

Every iteration does three things: **ask the model → run the tool it asked for → feed the result back**, until the model gives a final answer.

Every "framework" — LangChain, AutoGen, all of them — **is just this loop wrapped more conveniently**: logging, memory, concurrency, a UI. The kernel never changes.

Once that clicks, the other four ideas are easy.

## 1. Tool calling: the model decides, your code executes

A model can talk, not act. **Tool calling** hands it the ability to do things: you tell it the function **names and parameters**; it decides **which one and with what arguments**; **your code actually runs it** and feeds the result back.

The key line: **the model executes nothing**. It only emits "call `get_temp()`". **Your code always does the work** — that''s your safety boundary, and the reason "give the model a clean pair of hands" beats "give it a hundred tools."

> Don''t hoard tools. **Start with three you truly need.**

## 2. Memory: paste it short, retrieve it long

Models **have no memory** — every call is a stranger. An agent''s "memory" is just the context **you choose to feed back**:

- **Short-term**: append the conversation. Simple, but it grows and costs more.
- **Long-term**: store key facts in a **vector store** and **retrieve** them when needed. Cheaper, and it scales.

**Start short-term**; add long-term when volume or cross-session recall demands it.

One line to keep: **memory isn''t "storing" — it''s "retrieving next time."**

## 3. Observability: debugging an agent means reading its trace

Models are **non-deterministic**: the same input can take completely different paths. So **if you can''t see each step, you can''t debug at all.**

You need, at minimum: each **model decision**, each **tool call** with its arguments and result, and where **time and failures** go.

> **Debugging an agent is reading its execution trace.**

## 4. Local models: offline, private, edge-ready

Agents don''t need the cloud. Run them locally with **Ollama**: **free, offline, private** — and it fits **edge devices** (small models run on a Jetson). Most frameworks speak Ollama''s unified API; point `base_url` at localhost.

One lesson: **small models are weak at tool calling.** So the order is — **get the loop working on a strong model first, then size down.**

## Next: make it *your* agent

Once you understand those 20 lines, you only need to do one thing: **give it a tool of your own.**

Add a `get_device_temp()` — a plain function that reads a board''s temperature. The moment the model learns to "check the temperature first, then decide whether to throttle," you''ve taken the first step toward a **self-maintaining device agent**.

---

**In one line**: an agent = **a loop plus tools**; memory makes it remember, observability makes it debuggable, a local model makes it deployable. **Frameworks change — the kernel doesn''t.**
', '<p>New agent frameworks appear every month, which makes it easy to assume there&#39;s something deep inside. <strong>There isn&#39;t.</strong> Strip away the packaging and an agent is the 20 lines below.</p>
<h2>The core: a loop</h2>
<pre><code class="language-python">import json

TOOLS = {
    &quot;get_temp&quot;: lambda: {&quot;temp&quot;: 42},        # your real function
}

def agent(user_input):
    messages = [{&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: user_input}]
    while True:
        reply = llm(messages, tools=TOOLS)   # 1. ask the model
        messages.append(reply)
        if not reply.get(&quot;tool_calls&quot;):      # 2. no tool needed -&gt; answer
            return reply[&quot;content&quot;]
        for call in reply[&quot;tool_calls&quot;]:     # 3. actually run the tools
            result = TOOLS[call[&quot;name&quot;]]()
            messages.append({&quot;role&quot;: &quot;tool&quot;, &quot;content&quot;: json.dumps(result)})</code></pre>
<p>Every iteration does three things: <strong>ask the model → run the tool it asked for → feed the result back</strong>, until the model gives a final answer.</p>
<p>Every &quot;framework&quot; — LangChain, AutoGen, all of them — <strong>is just this loop wrapped more conveniently</strong>: logging, memory, concurrency, a UI. The kernel never changes.</p>
<p>Once that clicks, the other four ideas are easy.</p>
<h2>1. Tool calling: the model decides, your code executes</h2>
<p>A model can talk, not act. <strong>Tool calling</strong> hands it the ability to do things: you tell it the function <strong>names and parameters</strong>; it decides <strong>which one and with what arguments</strong>; <strong>your code actually runs it</strong> and feeds the result back.</p>
<p>The key line: <strong>the model executes nothing</strong>. It only emits &quot;call <code>get_temp()</code>&quot;. <strong>Your code always does the work</strong> — that&#39;s your safety boundary, and the reason &quot;give the model a clean pair of hands&quot; beats &quot;give it a hundred tools.&quot;</p>
<blockquote><p>Don&#39;t hoard tools. <strong>Start with three you truly need.</strong></p></blockquote>
<h2>2. Memory: paste it short, retrieve it long</h2>
<p>Models <strong>have no memory</strong> — every call is a stranger. An agent&#39;s &quot;memory&quot; is just the context <strong>you choose to feed back</strong>:</p>
<ul><li><strong>Short-term</strong>: append the conversation. Simple, but it grows and costs more.</li><li><strong>Long-term</strong>: store key facts in a <strong>vector store</strong> and <strong>retrieve</strong> them when needed. Cheaper, and it scales.</li></ul>
<p><strong>Start short-term</strong>; add long-term when volume or cross-session recall demands it.</p>
<p>One line to keep: <strong>memory isn&#39;t &quot;storing&quot; — it&#39;s &quot;retrieving next time.&quot;</strong></p>
<h2>3. Observability: debugging an agent means reading its trace</h2>
<p>Models are <strong>non-deterministic</strong>: the same input can take completely different paths. So <strong>if you can&#39;t see each step, you can&#39;t debug at all.</strong></p>
<p>You need, at minimum: each <strong>model decision</strong>, each <strong>tool call</strong> with its arguments and result, and where <strong>time and failures</strong> go.</p>
<blockquote><p><strong>Debugging an agent is reading its execution trace.</strong></p></blockquote>
<h2>4. Local models: offline, private, edge-ready</h2>
<p>Agents don&#39;t need the cloud. Run them locally with <strong>Ollama</strong>: <strong>free, offline, private</strong> — and it fits <strong>edge devices</strong> (small models run on a Jetson). Most frameworks speak Ollama&#39;s unified API; point <code>base_url</code> at localhost.</p>
<p>One lesson: <strong>small models are weak at tool calling.</strong> So the order is — <strong>get the loop working on a strong model first, then size down.</strong></p>
<h2>Next: make it <em>your</em> agent</h2>
<p>Once you understand those 20 lines, you only need to do one thing: <strong>give it a tool of your own.</strong></p>
<p>Add a <code>get_device_temp()</code> — a plain function that reads a board&#39;s temperature. The moment the model learns to &quot;check the temperature first, then decide whether to throttle,&quot; you&#39;ve taken the first step toward a <strong>self-maintaining device agent</strong>.</p>
<hr>
<p><strong>In one line</strong>: an agent = <strong>a loop plus tools</strong>; memory makes it remember, observability makes it debuggable, a local model makes it deployable. <strong>Frameworks change — the kernel doesn&#39;t.</strong></p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('ai-agent') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'build-ai-agent-from-scratch' AND t.name = 'ai-agent'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('智能体') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'build-ai-agent-from-scratch' AND t.name = '智能体'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('教程') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'build-ai-agent-from-scratch' AND t.name = '教程'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('function-calling') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'build-ai-agent-from-scratch' AND t.name = 'function-calling'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('ollama') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'build-ai-agent-from-scratch' AND t.name = 'ollama'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('github-download-acceleration', 'GitHub 下载加速与 CI 缓存：把受限网络下的首次构建从几天压到几十分钟', '实测 GitHub 直连与国内代理速度，并把 GitHub Actions 当下载代理：在 runner 上 fetch 全部源码，打包成 Release 分卷缓存，本地拉回后离线构建。', '<p>做嵌入式发行版，第一次构建经常慢得离谱——<strong>瓶颈几乎从来不是编译，而是下载</strong>。上游源码散落在 GitHub、kernel.org、SourceForge、huggingface……在受限网络下，随便一个源卡住就能拖掉一整天。</p>
<p>这篇讲两件事：<strong>先测速再选路</strong>，以及<strong>把 GitHub Actions 当成下载代理</strong>，把&quot;下载&quot;和&quot;编译&quot;彻底拆开。</p>
<blockquote><p>案例仓库：<a href="https://github.com/zishuowang696/embedai">embedai</a>（Jetson Orin Nano 的 Yocto 发行版，KAS 管理）。</p></blockquote>
<h2>一、先测速，别猜</h2>
<p>镜像/代理的质量随时间变化，凭印象选源必然踩坑。写了个小脚本，对<strong>同一个 URL</strong> 各取 20MB，打印实际速度：</p>
<pre><code class="language-bash">scripts/speedtest-github.sh [URL] [MB]</code></pre>
<p>实测结果（2026-09，单连接取 20MB）：</p>
<table><thead><tr><th>源</th><th>速度</th><th>结论</th></tr></thead><tbody><tr><td>直连 <code>github.com</code></td><td>超时 / 0</td><td>❌ 不稳定</td></tr><tr><td><code>ghproxy.net</code></td><td><strong>1.19 MB/s</strong></td><td>✅ 最快</td></tr><tr><td><code>gh-proxy.com</code></td><td>0.69 MB/s</td><td>✅ 可用</td></tr><tr><td><code>ghfast.top</code></td><td>0.22 MB/s</td><td>慢</td></tr><tr><td>其余几个常见代理</td><td>失败</td><td>❌ 已失效</td></tr></tbody></table>
<p>结论：<strong>单连接有上限，但可以叠加</strong>——6 路并行大约能到 5–6 MB/s。</p>
<h2>二、小文件：代理前缀就够</h2>
<p>GitHub Release 资产可以直接在 URL 前拼代理：</p>
<pre><code class="language-bash">curl -L -C - -O &quot;https://ghproxy.net/https://github.com/&lt;owner&gt;/&lt;repo&gt;/releases/download/&lt;tag&gt;/&lt;file&gt;&quot;</code></pre>
<p><code>-C -</code> 断点续传；多文件用 <code>curl -Z --parallel-max 6</code> 并行。<strong>下载完务必 <code>sha256sum -c</code> 校验</strong>——第三方代理不可全信。</p>
<h2>三、大工程：让 GitHub 当下载代理</h2>
<p>Yocto 要下的是<strong>几十 GB、上千个文件</strong>，逐个代理不现实。换个思路：</p>
<blockquote><p>GitHub Actions 的 runner 不受墙影响。<strong>让它在云端把源码全部 fetch 下来，打包，本地再拉回。</strong></p></blockquote>
<h3>存储选型（关键）</h3>
<table><thead><tr><th>资源</th><th>限制</th><th>适合吗</th></tr></thead><tbody><tr><td><strong>Release assets</strong></td><td>单文件 &lt;2 GiB、单 release ≤1000 个、<strong>总大小/带宽不限</strong></td><td>✅</td></tr><tr><td>Actions cache</td><td><strong>每仓库 10 GB</strong></td><td>❌</td></tr><tr><td>Actions artifacts</td><td>Free 仅 500 MB 且会过期</td><td>❌</td></tr></tbody></table>
<p>所以走 <strong>Release 分卷</strong>：不占 Actions cache 配额，公开仓库 Actions 分钟也免费。</p>
<h3>工作流</h3>
<p><code>fetch-cache.yml</code> 干这几件事：</p>
<ol><li>runner 上 <code>kas checkout</code> + <code>bitbake -k --runall=fetch embedai-image</code>（只下载，不编译）</li></ol>
<ol><li><code>downloads/</code> 打包成 <strong>1.9GB 分卷</strong>，生成 <code>SHA256SUMS</code></li></ol>
<ol><li>上传到 Release（tag <code>dl-cache</code>，标记 prerelease）</li></ol>
<p>实测：<strong>20.6 GB / 11 个分卷，全流程约 40 分钟</strong>。作为对比，同样的下载在受限网络下能拖到几天。</p>
<h2>四、本地拉回，离线构建</h2>
<pre><code class="language-bash">EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6 路并行 + 断点续传 + SHA256 校验 + 解压进 DL_DIR

BB_NO_NETWORK=&quot;1&quot; kas build kas.yml</code></pre>
<p><code>BB_NO_NETWORK=1</code> 强制离线——<strong>如果还缺源会立刻报错</strong>，能精确暴露问题，而不是卡在某个慢连接上。</p>
<h2>五、经验</h2>
<ul><li><strong>先测速</strong>，再决定用哪个镜像；把结果和日期记下来。</li><li><strong>下载与编译分离</strong>：<code>--runall=fetch</code> 只拉源码，可中断、可重跑。</li><li><strong>大缓存用 Release，不要用 Actions cache</strong>（10GB 上限）。</li><li>Yocto 源优先用 <strong>bitbake 镜像</strong>（kernel.org 用 USTC、huggingface 用 hf-mirror），比逐个代理 GitHub 更稳。</li><li>任何第三方代理都<strong>不要用于敏感内容</strong>，且必须校验哈希。</li></ul>
<p>相关脚本与文档都在 <a href="https://github.com/zishuowang696/embedai">embedai</a>：<code>scripts/speedtest-github.sh</code>、<code>scripts/pull-dl-cache.sh</code>、<code>docs/10-github-mirrors.md</code>。</p>', '---
title: "GitHub 下载加速与 CI 缓存：把受限网络下的首次构建从几天压到几十分钟"
date: 2026-09-14
tags: ["github", "yocto", "ci", "网络"]
summary: "实测 GitHub 直连与国内代理速度，并把 GitHub Actions 当下载代理：在 runner 上 fetch 全部源码，打包成 Release 分卷缓存，本地拉回后离线构建。"
series: "工程效率"
published: true
---

做嵌入式发行版，第一次构建经常慢得离谱——**瓶颈几乎从来不是编译，而是下载**。上游源码散落在 GitHub、kernel.org、SourceForge、huggingface……在受限网络下，随便一个源卡住就能拖掉一整天。

这篇讲两件事：**先测速再选路**，以及**把 GitHub Actions 当成下载代理**，把"下载"和"编译"彻底拆开。

> 案例仓库：[embedai](https://github.com/zishuowang696/embedai)（Jetson Orin Nano 的 Yocto 发行版，KAS 管理）。

## 一、先测速，别猜

镜像/代理的质量随时间变化，凭印象选源必然踩坑。写了个小脚本，对**同一个 URL** 各取 20MB，打印实际速度：

```bash
scripts/speedtest-github.sh [URL] [MB]
```

实测结果（2026-09，单连接取 20MB）：

| 源 | 速度 | 结论 |
| --- | --- | --- |
| 直连 `github.com` | 超时 / 0 | ❌ 不稳定 |
| `ghproxy.net` | **1.19 MB/s** | ✅ 最快 |
| `gh-proxy.com` | 0.69 MB/s | ✅ 可用 |
| `ghfast.top` | 0.22 MB/s | 慢 |
| 其余几个常见代理 | 失败 | ❌ 已失效 |

结论：**单连接有上限，但可以叠加**——6 路并行大约能到 5–6 MB/s。

## 二、小文件：代理前缀就够

GitHub Release 资产可以直接在 URL 前拼代理：

```bash
curl -L -C - -O "https://ghproxy.net/https://github.com/<owner>/<repo>/releases/download/<tag>/<file>"
```

`-C -` 断点续传；多文件用 `curl -Z --parallel-max 6` 并行。**下载完务必 `sha256sum -c` 校验**——第三方代理不可全信。

## 三、大工程：让 GitHub 当下载代理

Yocto 要下的是**几十 GB、上千个文件**，逐个代理不现实。换个思路：

> GitHub Actions 的 runner 不受墙影响。**让它在云端把源码全部 fetch 下来，打包，本地再拉回。**

### 存储选型（关键）

| 资源 | 限制 | 适合吗 |
| --- | --- | --- |
| **Release assets** | 单文件 <2 GiB、单 release ≤1000 个、**总大小/带宽不限** | ✅ |
| Actions cache | **每仓库 10 GB** | ❌ |
| Actions artifacts | Free 仅 500 MB 且会过期 | ❌ |

所以走 **Release 分卷**：不占 Actions cache 配额，公开仓库 Actions 分钟也免费。

### 工作流

`fetch-cache.yml` 干这几件事：

1. runner 上 `kas checkout` + `bitbake -k --runall=fetch embedai-image`（只下载，不编译）
2. `downloads/` 打包成 **1.9GB 分卷**，生成 `SHA256SUMS`
3. 上传到 Release（tag `dl-cache`，标记 prerelease）

实测：**20.6 GB / 11 个分卷，全流程约 40 分钟**。作为对比，同样的下载在受限网络下能拖到几天。

## 四、本地拉回，离线构建

```bash
EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6 路并行 + 断点续传 + SHA256 校验 + 解压进 DL_DIR

BB_NO_NETWORK="1" kas build kas.yml
```

`BB_NO_NETWORK=1` 强制离线——**如果还缺源会立刻报错**，能精确暴露问题，而不是卡在某个慢连接上。

## 五、经验

- **先测速**，再决定用哪个镜像；把结果和日期记下来。
- **下载与编译分离**：`--runall=fetch` 只拉源码，可中断、可重跑。
- **大缓存用 Release，不要用 Actions cache**（10GB 上限）。
- Yocto 源优先用 **bitbake 镜像**（kernel.org 用 USTC、huggingface 用 hf-mirror），比逐个代理 GitHub 更稳。
- 任何第三方代理都**不要用于敏感内容**，且必须校验哈希。

相关脚本与文档都在 [embedai](https://github.com/zishuowang696/embedai)：`scripts/speedtest-github.sh`、`scripts/pull-dl-cache.sh`、`docs/10-github-mirrors.md`。
', '工程效率', 1, '2026-09-14', '2026-10-08T22:38:26.715Z', 'GitHub Download Acceleration and CI Caching: From Days to Minutes Behind a Restricted Network', 'Measured GitHub direct vs. China proxies, then used GitHub Actions as a download proxy: fetch all sources on a runner, store them as split Release assets, pull locally and build offline.', 'Building an embedded distribution, the first build is often absurdly slow — and **the bottleneck is almost never compiling, it''s downloading**. Upstream sources are scattered across GitHub, kernel.org, SourceForge, huggingface… behind a restricted network, one stuck host can eat a whole day.

This post covers two things: **measure before choosing a route**, and **using GitHub Actions as a download proxy** to fully separate "download" from "compile".

> Case repo: [embedai](https://github.com/zishuowang696/embedai) — a Yocto distro for Jetson Orin Nano, managed with KAS.

## 1. Measure first, don''t guess

Mirror/proxy quality changes over time; picking by intuition always backfires. A small script downloads the **same URL** (20 MB) through each source and prints the real speed:

```bash
scripts/speedtest-github.sh [URL] [MB]
```

Measured results (2026-09, single connection, 20 MB):

| Source | Speed | Verdict |
| --- | --- | --- |
| direct `github.com` | timeout / 0 | ❌ unstable |
| `ghproxy.net` | **1.19 MB/s** | ✅ fastest |
| `gh-proxy.com` | 0.69 MB/s | ✅ usable |
| `ghfast.top` | 0.22 MB/s | slow |
| several other well-known proxies | failed | ❌ dead |

Conclusion: **single-connection speed has a ceiling, but it stacks** — 6 parallel connections reach roughly 5–6 MB/s.

## 2. Small files: a proxy prefix is enough

GitHub Release assets can be fetched by prefixing the URL with a proxy:

```bash
curl -L -C - -O "https://ghproxy.net/https://github.com/<owner>/<repo>/releases/download/<tag>/<file>"
```

`-C -` resumes; for many files use `curl -Z --parallel-max 6`. **Always verify with `sha256sum -c`** — third-party proxies shouldn''t be fully trusted.

## 3. Big jobs: let GitHub be the download proxy

Yocto pulls **tens of GB across thousands of files**; proxying each one isn''t realistic. Change the approach:

> GitHub Actions runners are not affected by the firewall. **Let the runner fetch everything in the cloud, package it, and pull it back locally.**

### Storage choice (the key part)

| Resource | Limit | Suitable? |
| --- | --- | --- |
| **Release assets** | <2 GiB per file, ≤1000 per release, **no total/bandwidth limit** | ✅ |
| Actions cache | **10 GB per repository** | ❌ |
| Actions artifacts | Free plan: 500 MB, expires | ❌ |

So use **Release assets split into parts**: no Actions cache quota, and Actions minutes are free for public repos.

### The workflow

`fetch-cache.yml` does:

1. On the runner: `kas checkout` + `bitbake -k --runall=fetch embedai-image` (download only, no compile)
2. Package `downloads/` into **1.9 GB parts** + `SHA256SUMS`
3. Upload to a Release (tag `dl-cache`, marked prerelease)

Measured: **20.6 GB / 11 parts, ~40 minutes end to end**. For comparison, the same download behind a restricted network can drag on for days.

## 4. Pull locally, build offline

```bash
EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6-way parallel + resume + SHA256 verify + extract into DL_DIR

BB_NO_NETWORK="1" kas build kas.yml
```

`BB_NO_NETWORK=1` forces offline mode — **if a source is still missing it fails immediately**, exposing the exact gap instead of hanging on a slow connection.

## 5. Takeaways

- **Measure first**, then pick a mirror; record the result and date.
- **Separate download from compile**: `--runall=fetch` downloads sources only, resumable and re-runnable.
- **Use Releases for big caches, not Actions cache** (10 GB limit).
- For Yocto sources prefer **bitbake mirrors** (kernel.org via USTC, huggingface via hf-mirror) over proxying GitHub one file at a time.
- Never route sensitive content through third-party proxies, and always verify hashes.

Scripts and docs live in [embedai](https://github.com/zishuowang696/embedai): `scripts/speedtest-github.sh`, `scripts/pull-dl-cache.sh`, `docs/10-github-mirrors.md`.
', '<p>Building an embedded distribution, the first build is often absurdly slow — and <strong>the bottleneck is almost never compiling, it&#39;s downloading</strong>. Upstream sources are scattered across GitHub, kernel.org, SourceForge, huggingface… behind a restricted network, one stuck host can eat a whole day.</p>
<p>This post covers two things: <strong>measure before choosing a route</strong>, and <strong>using GitHub Actions as a download proxy</strong> to fully separate &quot;download&quot; from &quot;compile&quot;.</p>
<blockquote><p>Case repo: <a href="https://github.com/zishuowang696/embedai">embedai</a> — a Yocto distro for Jetson Orin Nano, managed with KAS.</p></blockquote>
<h2>1. Measure first, don&#39;t guess</h2>
<p>Mirror/proxy quality changes over time; picking by intuition always backfires. A small script downloads the <strong>same URL</strong> (20 MB) through each source and prints the real speed:</p>
<pre><code class="language-bash">scripts/speedtest-github.sh [URL] [MB]</code></pre>
<p>Measured results (2026-09, single connection, 20 MB):</p>
<table><thead><tr><th>Source</th><th>Speed</th><th>Verdict</th></tr></thead><tbody><tr><td>direct <code>github.com</code></td><td>timeout / 0</td><td>❌ unstable</td></tr><tr><td><code>ghproxy.net</code></td><td><strong>1.19 MB/s</strong></td><td>✅ fastest</td></tr><tr><td><code>gh-proxy.com</code></td><td>0.69 MB/s</td><td>✅ usable</td></tr><tr><td><code>ghfast.top</code></td><td>0.22 MB/s</td><td>slow</td></tr><tr><td>several other well-known proxies</td><td>failed</td><td>❌ dead</td></tr></tbody></table>
<p>Conclusion: <strong>single-connection speed has a ceiling, but it stacks</strong> — 6 parallel connections reach roughly 5–6 MB/s.</p>
<h2>2. Small files: a proxy prefix is enough</h2>
<p>GitHub Release assets can be fetched by prefixing the URL with a proxy:</p>
<pre><code class="language-bash">curl -L -C - -O &quot;https://ghproxy.net/https://github.com/&lt;owner&gt;/&lt;repo&gt;/releases/download/&lt;tag&gt;/&lt;file&gt;&quot;</code></pre>
<p><code>-C -</code> resumes; for many files use <code>curl -Z --parallel-max 6</code>. <strong>Always verify with <code>sha256sum -c</code></strong> — third-party proxies shouldn&#39;t be fully trusted.</p>
<h2>3. Big jobs: let GitHub be the download proxy</h2>
<p>Yocto pulls <strong>tens of GB across thousands of files</strong>; proxying each one isn&#39;t realistic. Change the approach:</p>
<blockquote><p>GitHub Actions runners are not affected by the firewall. <strong>Let the runner fetch everything in the cloud, package it, and pull it back locally.</strong></p></blockquote>
<h3>Storage choice (the key part)</h3>
<table><thead><tr><th>Resource</th><th>Limit</th><th>Suitable?</th></tr></thead><tbody><tr><td><strong>Release assets</strong></td><td>&lt;2 GiB per file, ≤1000 per release, <strong>no total/bandwidth limit</strong></td><td>✅</td></tr><tr><td>Actions cache</td><td><strong>10 GB per repository</strong></td><td>❌</td></tr><tr><td>Actions artifacts</td><td>Free plan: 500 MB, expires</td><td>❌</td></tr></tbody></table>
<p>So use <strong>Release assets split into parts</strong>: no Actions cache quota, and Actions minutes are free for public repos.</p>
<h3>The workflow</h3>
<p><code>fetch-cache.yml</code> does:</p>
<ol><li>On the runner: <code>kas checkout</code> + <code>bitbake -k --runall=fetch embedai-image</code> (download only, no compile)</li></ol>
<ol><li>Package <code>downloads/</code> into <strong>1.9 GB parts</strong> + <code>SHA256SUMS</code></li></ol>
<ol><li>Upload to a Release (tag <code>dl-cache</code>, marked prerelease)</li></ol>
<p>Measured: <strong>20.6 GB / 11 parts, ~40 minutes end to end</strong>. For comparison, the same download behind a restricted network can drag on for days.</p>
<h2>4. Pull locally, build offline</h2>
<pre><code class="language-bash">EMBEDAI_MIRROR=https://ghproxy.net scripts/pull-dl-cache.sh
# 6-way parallel + resume + SHA256 verify + extract into DL_DIR

BB_NO_NETWORK=&quot;1&quot; kas build kas.yml</code></pre>
<p><code>BB_NO_NETWORK=1</code> forces offline mode — <strong>if a source is still missing it fails immediately</strong>, exposing the exact gap instead of hanging on a slow connection.</p>
<h2>5. Takeaways</h2>
<ul><li><strong>Measure first</strong>, then pick a mirror; record the result and date.</li><li><strong>Separate download from compile</strong>: <code>--runall=fetch</code> downloads sources only, resumable and re-runnable.</li><li><strong>Use Releases for big caches, not Actions cache</strong> (10 GB limit).</li><li>For Yocto sources prefer <strong>bitbake mirrors</strong> (kernel.org via USTC, huggingface via hf-mirror) over proxying GitHub one file at a time.</li><li>Never route sensitive content through third-party proxies, and always verify hashes.</li></ul>
<p>Scripts and docs live in <a href="https://github.com/zishuowang696/embedai">embedai</a>: <code>scripts/speedtest-github.sh</code>, <code>scripts/pull-dl-cache.sh</code>, <code>docs/10-github-mirrors.md</code>.</p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('github') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'github-download-acceleration' AND t.name = 'github'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'github-download-acceleration' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('ci') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'github-download-acceleration' AND t.name = 'ci'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('网络') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'github-download-acceleration' AND t.name = '网络'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('jetson-build-rust-llvm-optee', '为什么编个 Jetson 镜像，Yocto 会顺手编出 Rust 和 LLVM？', '一次构建长时间卡在 llvm-native / rust-native。用 bitbake -g 反向追依赖，根因是 Tegra 启动链里的 OP-TEE / EKS 需要 python3-cryptography，而它现在是 Rust 写的。', '<p>在维护 Jetson 发行版（<code>embedai</code>）时，CI 里最慢的从来不是我的应用，也不是内核，而是两个我&quot;根本没用到&quot;的东西：<strong><code>llvm-native</code> 和 <code>rust-native</code></strong>。</p>
<p>这篇文章记录一次完整的排查：<strong>从&quot;日志里突然冒出 LLVM&quot;，一路逆推到 Tegra 的启动链。</strong></p>
<h2>1. 现象</h2>
<p>构建日志里反复出现：</p>
<pre><code>active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install</code></pre>
<p>一个&quot;无 GUI、只跑 AI&quot;的镜像，为什么要编 LLVM 和 Rust 编译器？而且它们<strong>动辄数小时</strong>。</p>
<h2>2. 方法：用依赖图逆查</h2>
<p>不要猜，用 bitbake 自己的依赖图：</p>
<pre><code class="language-bash">kas shell kas.yml -c &quot;bitbake -g embedai-image&quot;
# 生成 pn-buildlist（包清单）与 task-depends.dot（任务依赖图）</code></pre>
<p>然后在 <code>task-depends.dot</code> 里<strong>反向找&quot;谁依赖它&quot;</strong>：对每条 <code>&quot;A&quot; -&gt; &quot;B&quot;</code>（A 依赖 B），统计所有指向 <code>llvm-native</code>、<code>rust-native</code> 的边，并剥掉同 recipe 的内部依赖。</p>
<p>结果（本机实测）：</p>
<pre><code>llvm-native            &lt;- rust-native
rust-native            &lt;- python3-cryptography-native, python3-maturin-native
python3-maturin-native &lt;- python3-cryptography-native
python3-cryptography-native &lt;- optee-nvsamples-native
optee-nvsamples-native &lt;- tegra-eks-image
tegra-eks-image        &lt;- tegra-bootfiles</code></pre>
<p>链条一路清晰：</p>
<pre><code>tegra-bootfiles            （启动固件打包）
  → tegra-eks-image        （NVIDIA EKS 加密密钥库镜像）
    → optee-nvsamples-native
      → python3-cryptography-native   ← 关键
        → python3-maturin-native / setuptools-rust-native
          → rust-native + cargo-native
            → llvm-native</code></pre>
<h2>3. 为什么会这样</h2>
<ul><li><strong><code>python3-cryptography</code> 从 42 版起是 Rust 写的</strong>。它是一个 Python 包，但内部用 Rust 实现密码学原语，构建时要 <code>cargo</code>（<code>maturin</code> / <code>setuptools-rust</code> 负责编）。</li><li><strong>Rust 编译器的后端就是 LLVM</strong>（<code>rustc</code> 借 LLVM 做代码生成）——所以在 Yocto 里编 <code>rust-native</code>，会顺带编 <code>llvm-native</code>。</li><li>一句话：<strong>为了编一个 Python 的密码学库，构建被迫先编出 Rust 编译器，再编出 LLVM。</strong></li></ul>
<h2>4. 根在 Tegra 的启动链</h2>
<p><code>meta-tegra/recipes-security/optee/optee-l4t.inc</code> 里有一行：</p>
<pre><code class="language-bitbake">DEPENDS = &quot;python3-pyelftools-native python3-cryptography-native&quot;</code></pre>
<p>而 <code>optee-nvsamples-native</code> 继承了这个 inc；它又是 <strong><code>tegra-eks-image</code>（EKS 密钥库镜像）</strong>的依赖，EKS 则是<strong>启动固件</strong>（<code>tegra-bootfiles</code>）的一环。</p>
<p>所以：<strong>Tegra 的安全启动基础设施要用 Python 的 cryptography 来签名/处理密钥 → Rust → LLVM。</strong></p>
<h2>5. 试过的开关（以及它的边界）</h2>
<p>meta-tegra 提供了一个开关，让 OP-TEE 用 NVIDIA 预编译而不是从源码编：</p>
<pre><code class="language-conf">USE_PREBUILT_OPTEE = &quot;1&quot;</code></pre>
<p>效果：<strong><code>tos-optee</code> 换成 <code>tos-prebuilt</code>，<code>optee-os</code> 从依赖图里消失</strong>——省掉一个大件。</p>
<p>但<strong>Rust/LLVM 仍在</strong>：因为 <code>cryptography</code> 走的是 <strong>EKS 那条支线</strong>（<code>optee-nvsamples-native</code>），<strong>不是</strong> <code>optee-os</code>。<strong>砍掉一层，还有一层。</strong></p>
<h2>6. 顺带辟谣：不是 OpenGL</h2>
<p>一度怀疑是发行版带 <code>opengl</code>（oe-core 默认特性）拉了 <code>mesa → clang/llvm</code>。但依赖图证明：<strong><code>mesa</code> 根本不在 Jetson 的构建图里</strong>（它属于 qemu 配置那套）。——<strong>先查图，别靠猜</strong>，这条省了我们一次错误的大改。</p>
<h2>7. 结论</h2>
<ul><li><strong>重型 native（LLVM / Rust / Clang）几乎都是被某个包的依赖或可选特性&quot;顺手&quot;拉进来的</strong>，不是核心必需；</li><li><strong>定位手段</strong>：<code>bitbake -g</code> + 在 <code>task-depends.dot</code> 里<strong>反向找上游</strong>，一层层剥；</li><li><strong>代价是一次性的</strong>：sstate 缓存命中后，后续与 CI 都不会再编——这也是&quot;<strong>必须把 sstate 攒满</strong>&quot;的真正意义。</li></ul>
<blockquote><p>下次你的 Yocto 构建莫名卡在 <code>llvm-native</code>，别急着怪硬件——先顺着依赖图问一句：<strong>是谁把它拉进来的？</strong> 答案往往在一个你没想到的角落（这次是：OP-TEE 的密钥库镜像）。</p></blockquote>', '---
title: "为什么编个 Jetson 镜像，Yocto 会顺手编出 Rust 和 LLVM？"
date: 2026-09-28
tags: ["yocto", "jetson", "optee", "rust", "llvm", "构建提速"]
summary: "一次构建长时间卡在 llvm-native / rust-native。用 bitbake -g 反向追依赖，根因是 Tegra 启动链里的 OP-TEE / EKS 需要 python3-cryptography，而它现在是 Rust 写的。"
series: "AI 网关实战"
published: true
---

在维护 Jetson 发行版（`embedai`）时，CI 里最慢的从来不是我的应用，也不是内核，而是两个我"根本没用到"的东西：**`llvm-native` 和 `rust-native`**。

这篇文章记录一次完整的排查：**从"日志里突然冒出 LLVM"，一路逆推到 Tegra 的启动链。**

## 1. 现象

构建日志里反复出现：

```
active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install
```

一个"无 GUI、只跑 AI"的镜像，为什么要编 LLVM 和 Rust 编译器？而且它们**动辄数小时**。

## 2. 方法：用依赖图逆查

不要猜，用 bitbake 自己的依赖图：

```bash
kas shell kas.yml -c "bitbake -g embedai-image"
# 生成 pn-buildlist（包清单）与 task-depends.dot（任务依赖图）
```

然后在 `task-depends.dot` 里**反向找"谁依赖它"**：对每条 `"A" -> "B"`（A 依赖 B），统计所有指向 `llvm-native`、`rust-native` 的边，并剥掉同 recipe 的内部依赖。

结果（本机实测）：

```
llvm-native            <- rust-native
rust-native            <- python3-cryptography-native, python3-maturin-native
python3-maturin-native <- python3-cryptography-native
python3-cryptography-native <- optee-nvsamples-native
optee-nvsamples-native <- tegra-eks-image
tegra-eks-image        <- tegra-bootfiles
```

链条一路清晰：

```
tegra-bootfiles            （启动固件打包）
  → tegra-eks-image        （NVIDIA EKS 加密密钥库镜像）
    → optee-nvsamples-native
      → python3-cryptography-native   ← 关键
        → python3-maturin-native / setuptools-rust-native
          → rust-native + cargo-native
            → llvm-native
```

## 3. 为什么会这样

- **`python3-cryptography` 从 42 版起是 Rust 写的**。它是一个 Python 包，但内部用 Rust 实现密码学原语，构建时要 `cargo`（`maturin` / `setuptools-rust` 负责编）。
- **Rust 编译器的后端就是 LLVM**（`rustc` 借 LLVM 做代码生成）——所以在 Yocto 里编 `rust-native`，会顺带编 `llvm-native`。
- 一句话：**为了编一个 Python 的密码学库，构建被迫先编出 Rust 编译器，再编出 LLVM。**

## 4. 根在 Tegra 的启动链

`meta-tegra/recipes-security/optee/optee-l4t.inc` 里有一行：

```bitbake
DEPENDS = "python3-pyelftools-native python3-cryptography-native"
```

而 `optee-nvsamples-native` 继承了这个 inc；它又是 **`tegra-eks-image`（EKS 密钥库镜像）**的依赖，EKS 则是**启动固件**（`tegra-bootfiles`）的一环。

所以：**Tegra 的安全启动基础设施要用 Python 的 cryptography 来签名/处理密钥 → Rust → LLVM。**

## 5. 试过的开关（以及它的边界）

meta-tegra 提供了一个开关，让 OP-TEE 用 NVIDIA 预编译而不是从源码编：

```conf
USE_PREBUILT_OPTEE = "1"
```

效果：**`tos-optee` 换成 `tos-prebuilt`，`optee-os` 从依赖图里消失**——省掉一个大件。

但**Rust/LLVM 仍在**：因为 `cryptography` 走的是 **EKS 那条支线**（`optee-nvsamples-native`），**不是** `optee-os`。**砍掉一层，还有一层。**

## 6. 顺带辟谣：不是 OpenGL

一度怀疑是发行版带 `opengl`（oe-core 默认特性）拉了 `mesa → clang/llvm`。但依赖图证明：**`mesa` 根本不在 Jetson 的构建图里**（它属于 qemu 配置那套）。——**先查图，别靠猜**，这条省了我们一次错误的大改。

## 7. 结论

- **重型 native（LLVM / Rust / Clang）几乎都是被某个包的依赖或可选特性"顺手"拉进来的**，不是核心必需；
- **定位手段**：`bitbake -g` + 在 `task-depends.dot` 里**反向找上游**，一层层剥；
- **代价是一次性的**：sstate 缓存命中后，后续与 CI 都不会再编——这也是"**必须把 sstate 攒满**"的真正意义。

> 下次你的 Yocto 构建莫名卡在 `llvm-native`，别急着怪硬件——先顺着依赖图问一句：**是谁把它拉进来的？** 答案往往在一个你没想到的角落（这次是：OP-TEE 的密钥库镜像）。
', 'AI 网关实战', 1, '2026-09-28', '2026-10-08T22:38:26.717Z', 'Why a Jetson Image Build Silently Compiles Rust and LLVM', 'A build kept stalling on llvm-native and rust-native. Tracing reverse dependencies with bitbake -g led to Tegra''s OP-TEE / EKS boot chain needing python3-cryptography — which is written in Rust.', 'While maintaining a Jetson distro (`embedai`), the slowest parts of CI were never my apps or the kernel. They were two things I never asked for: **`llvm-native` and `rust-native`**.

This is a write-up of the investigation: **from "why is LLVM in my build log?" all the way back to Tegra''s boot chain.**

## 1. Symptom

The build log kept showing:

```
active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install
```

A "headless, AI-only" image that compiles the LLVM and Rust toolchains from source — hours of work I did not ask for.

## 2. Method: trace reverse dependencies

Don''t guess. Use bitbake''s own dependency graph:

```bash
kas shell kas.yml -c "bitbake -g embedai-image"
# generates pn-buildlist and task-depends.dot
```

Then look for **who depends on it**. For every edge `"A" -> "B"` (A depends on B), collect the recipes that point at `llvm-native` / `rust-native`, ignoring intra-recipe edges.

Measured chain:

```
tegra-bootfiles
  -> tegra-eks-image            (NVIDIA EKS key-store image)
    -> optee-nvsamples-native
      -> python3-cryptography-native
        -> python3-maturin-native / setuptools-rust-native
          -> rust-native + cargo-native
            -> llvm-native
```

## 3. Why

- **`python3-cryptography` has been Rust-based since v42.** It''s a Python package, but its crypto primitives are implemented in Rust, so building it requires `cargo` (via `maturin` / `setuptools-rust`).
- **Rust''s compiler backend *is* LLVM**, so building `rust-native` drags in `llvm-native`.
- In short: **to build one Python crypto library, the build first compiles the Rust compiler, then LLVM.**

## 4. Root cause: Tegra''s boot chain

`meta-tegra/recipes-security/optee/optee-l4t.inc` contains:

```bitbake
DEPENDS = "python3-pyelftools-native python3-cryptography-native"
```

`optee-nvsamples-native` inherits it; it''s a dependency of **`tegra-eks-image`** (the EKS key-store image), which is part of the **boot firmware** (`tegra-bootfiles`).

So: **Tegra''s secure-boot infrastructure needs Python''s cryptography to sign / handle keys → Rust → LLVM.**

## 5. A switch, and its limits

meta-tegra offers a flag to use NVIDIA''s prebuilt OP-TEE instead of building from source:

```conf
USE_PREBUILT_OPTEE = "1"
```

Effect: **`tos-optee` becomes `tos-prebuilt`, and `optee-os` disappears from the graph** — one big recipe gone.

But the Rust/LLVM chain **stays**, because `cryptography` comes in via the **EKS branch** (`optee-nvsamples-native`), not `optee-os`. **Cut one layer, find another.**

## 6. A red herring: it is not OpenGL

I suspected the distro''s `opengl` feature (an oe-core default) pulling `mesa → clang/llvm`. The graph proved otherwise: **`mesa` is not in the Jetson build at all** (it belongs to the QEMU config). — **Read the graph, don''t guess.** That saved a pointless large change.

## 7. Takeaways

- **Heavy natives (LLVM / Rust / Clang) are almost always pulled in by some package''s dependency or optional feature**, not by core requirements.
- **How to find it**: `bitbake -g`, then walk `task-depends.dot` **upstream**, one layer at a time.
- **The cost is one-time**: once `sstate` is populated, neither local nor CI rebuilds it again — which is exactly why **filling the sstate cache matters**.

> Next time your Yocto build mysteriously stalls on `llvm-native`, don''t blame the hardware — follow the dependency graph and ask: **who dragged it in?** The answer is often in a corner you''d never expect (this time: OP-TEE''s key-store image).
', '<p>While maintaining a Jetson distro (<code>embedai</code>), the slowest parts of CI were never my apps or the kernel. They were two things I never asked for: <strong><code>llvm-native</code> and <code>rust-native</code></strong>.</p>
<p>This is a write-up of the investigation: <strong>from &quot;why is LLVM in my build log?&quot; all the way back to Tegra&#39;s boot chain.</strong></p>
<h2>1. Symptom</h2>
<p>The build log kept showing:</p>
<pre><code>active tasks:
  virtual:native:/.../recipes-devtools/clang/llvm_git.bb:do_compile
  virtual:native:/.../recipes-devtools/rust/rust_1.96.1.bb:do_install</code></pre>
<p>A &quot;headless, AI-only&quot; image that compiles the LLVM and Rust toolchains from source — hours of work I did not ask for.</p>
<h2>2. Method: trace reverse dependencies</h2>
<p>Don&#39;t guess. Use bitbake&#39;s own dependency graph:</p>
<pre><code class="language-bash">kas shell kas.yml -c &quot;bitbake -g embedai-image&quot;
# generates pn-buildlist and task-depends.dot</code></pre>
<p>Then look for <strong>who depends on it</strong>. For every edge <code>&quot;A&quot; -&gt; &quot;B&quot;</code> (A depends on B), collect the recipes that point at <code>llvm-native</code> / <code>rust-native</code>, ignoring intra-recipe edges.</p>
<p>Measured chain:</p>
<pre><code>tegra-bootfiles
  -&gt; tegra-eks-image            (NVIDIA EKS key-store image)
    -&gt; optee-nvsamples-native
      -&gt; python3-cryptography-native
        -&gt; python3-maturin-native / setuptools-rust-native
          -&gt; rust-native + cargo-native
            -&gt; llvm-native</code></pre>
<h2>3. Why</h2>
<ul><li><strong><code>python3-cryptography</code> has been Rust-based since v42.</strong> It&#39;s a Python package, but its crypto primitives are implemented in Rust, so building it requires <code>cargo</code> (via <code>maturin</code> / <code>setuptools-rust</code>).</li><li>**Rust&#39;s compiler backend <em>is</em> LLVM**, so building <code>rust-native</code> drags in <code>llvm-native</code>.</li><li>In short: <strong>to build one Python crypto library, the build first compiles the Rust compiler, then LLVM.</strong></li></ul>
<h2>4. Root cause: Tegra&#39;s boot chain</h2>
<p><code>meta-tegra/recipes-security/optee/optee-l4t.inc</code> contains:</p>
<pre><code class="language-bitbake">DEPENDS = &quot;python3-pyelftools-native python3-cryptography-native&quot;</code></pre>
<p><code>optee-nvsamples-native</code> inherits it; it&#39;s a dependency of <strong><code>tegra-eks-image</code></strong> (the EKS key-store image), which is part of the <strong>boot firmware</strong> (<code>tegra-bootfiles</code>).</p>
<p>So: <strong>Tegra&#39;s secure-boot infrastructure needs Python&#39;s cryptography to sign / handle keys → Rust → LLVM.</strong></p>
<h2>5. A switch, and its limits</h2>
<p>meta-tegra offers a flag to use NVIDIA&#39;s prebuilt OP-TEE instead of building from source:</p>
<pre><code class="language-conf">USE_PREBUILT_OPTEE = &quot;1&quot;</code></pre>
<p>Effect: <strong><code>tos-optee</code> becomes <code>tos-prebuilt</code>, and <code>optee-os</code> disappears from the graph</strong> — one big recipe gone.</p>
<p>But the Rust/LLVM chain <strong>stays</strong>, because <code>cryptography</code> comes in via the <strong>EKS branch</strong> (<code>optee-nvsamples-native</code>), not <code>optee-os</code>. <strong>Cut one layer, find another.</strong></p>
<h2>6. A red herring: it is not OpenGL</h2>
<p>I suspected the distro&#39;s <code>opengl</code> feature (an oe-core default) pulling <code>mesa → clang/llvm</code>. The graph proved otherwise: <strong><code>mesa</code> is not in the Jetson build at all</strong> (it belongs to the QEMU config). — <strong>Read the graph, don&#39;t guess.</strong> That saved a pointless large change.</p>
<h2>7. Takeaways</h2>
<ul><li><strong>Heavy natives (LLVM / Rust / Clang) are almost always pulled in by some package&#39;s dependency or optional feature</strong>, not by core requirements.</li><li><strong>How to find it</strong>: <code>bitbake -g</code>, then walk <code>task-depends.dot</code> <strong>upstream</strong>, one layer at a time.</li><li><strong>The cost is one-time</strong>: once <code>sstate</code> is populated, neither local nor CI rebuilds it again — which is exactly why <strong>filling the sstate cache matters</strong>.</li></ul>
<blockquote><p>Next time your Yocto build mysteriously stalls on <code>llvm-native</code>, don&#39;t blame the hardware — follow the dependency graph and ask: <strong>who dragged it in?</strong> The answer is often in a corner you&#39;d never expect (this time: OP-TEE&#39;s key-store image).</p></blockquote>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('jetson') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = 'jetson'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('optee') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = 'optee'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('rust') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = 'rust'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('llvm') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = 'llvm'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('构建提速') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'jetson-build-rust-llvm-optee' AND t.name = '构建提速'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
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
', 'AI 网关实战', 1, '2026-08-15', '2026-10-08T22:38:26.722Z', 'Containerized TensorRT on Jetson Orin: From Cross-Compile to Flashing', 'Run TensorRT inference in JetPack containers on NVIDIA Jetson Orin and deploy it as an edge AI gateway, including jetson-flash essentials.', 'The "embedded" story of NVIDIA''s Tegra platform is different from routers: the highlight is the on-board GPU, which makes it great for pushing model inference to the edge. This post clarifies the three layers from unboxing an Orin to running your first TensorRT program.

> Assumptions: Jetson Orin Nano 8 GB, host Ubuntu 22.04 x86_64, target JetPack 6.0 (L4T r36.x).

## 0. Three layers, clearly separated

- **BSP / JetPack**: system + drivers + CUDA/TensorRT — essentially a Yocto-style L4T distro.
- **Containers**: JetPack ships `nvcr.io/nvidia/l4t-*` images so you don''t pollute the host.
- **Cross-compilation**: build `aarch64` binaries on your x86 host, then copy them to the board.

## 1. Flashing: SDK Manager or the command line

Flashing from the CLI (download the JetPack archive first):

```bash
export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit
```

Key points:

- Connect a USB cable to the Orin **Type-C recovery port**; hold Recovery and power on to enter flash mode.
- Back up before flashing: `$L4T_DIR/bootloader/system.img` must not be copied directly — use `nvbackup` for a full backup.

## 2. Deployment: containerize the inference service

On the board, use the official containers:

```bash
# You need an NVIDIA NGC account for nvcr.io credentials
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt
```

## 3. Exposing it to the LAN: an edge AI gateway prototype

Run a forwarding/inference agent on the board (Python + FastAPI works too). The key idea is to forward RTSP/HTTP frames over **shared memory or a local socket**:

```bash
# Simplified "frame → TensorRT → result" pipeline skeleton
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink
```

A full gateway layers OpenWrt-side NAT/bandwidth management on top; see the rest of the series.

## Wrap-up

| Step | Tool | Purpose |
| --- | --- | --- |
| Flash the system | jetson-flash / SDK Manager | L4T + drivers |
| Inference | l4t-tensorrt container | keeps the host clean |
| Deployment | Docker + systemd | always-on edge service |
', '<p>The &quot;embedded&quot; story of NVIDIA&#39;s Tegra platform is different from routers: the highlight is the on-board GPU, which makes it great for pushing model inference to the edge. This post clarifies the three layers from unboxing an Orin to running your first TensorRT program.</p>
<blockquote><p>Assumptions: Jetson Orin Nano 8 GB, host Ubuntu 22.04 x86_64, target JetPack 6.0 (L4T r36.x).</p></blockquote>
<h2>0. Three layers, clearly separated</h2>
<ul><li><strong>BSP / JetPack</strong>: system + drivers + CUDA/TensorRT — essentially a Yocto-style L4T distro.</li><li><strong>Containers</strong>: JetPack ships <code>nvcr.io/nvidia/l4t-*</code> images so you don&#39;t pollute the host.</li><li><strong>Cross-compilation</strong>: build <code>aarch64</code> binaries on your x86 host, then copy them to the board.</li></ul>
<h2>1. Flashing: SDK Manager or the command line</h2>
<p>Flashing from the CLI (download the JetPack archive first):</p>
<pre><code class="language-bash">export L4T_DIR=/opt/nvidia/Linux_for_Tegra
cd $L4T_DIR
sudo ./tools/jetson-flash.sh jetson-orin-nano-devkit</code></pre>
<p>Key points:</p>
<ul><li>Connect a USB cable to the Orin <strong>Type-C recovery port</strong>; hold Recovery and power on to enter flash mode.</li><li>Back up before flashing: <code>$L4T_DIR/bootloader/system.img</code> must not be copied directly — use <code>nvbackup</code> for a full backup.</li></ul>
<h2>2. Deployment: containerize the inference service</h2>
<p>On the board, use the official containers:</p>
<pre><code class="language-bash"># You need an NVIDIA NGC account for nvcr.io credentials
docker run --rm --runtime nvidia --network host \
  -v /home/nvidia/models:/models \
  nvcr.io/nvidia/l4t-tensorrt:r8.6.2 \
  trtexec --onnx=/models/yolov8n.onnx --saveEngine=/models/yolov8n.trt</code></pre>
<h2>3. Exposing it to the LAN: an edge AI gateway prototype</h2>
<p>Run a forwarding/inference agent on the board (Python + FastAPI works too). The key idea is to forward RTSP/HTTP frames over <strong>shared memory or a local socket</strong>:</p>
<pre><code class="language-bash"># Simplified &quot;frame → TensorRT → result&quot; pipeline skeleton
gst-launch-1.0 v4l2src ! videoconvert ! nvvideoconvert ! \
  nvinfer config-file-path=/models/yolov8n.txt ! \
  nvdsosd ! nveglglesink</code></pre>
<p>A full gateway layers OpenWrt-side NAT/bandwidth management on top; see the rest of the series.</p>
<h2>Wrap-up</h2>
<table><thead><tr><th>Step</th><th>Tool</th><th>Purpose</th></tr></thead><tbody><tr><td>Flash the system</td><td>jetson-flash / SDK Manager</td><td>L4T + drivers</td></tr><tr><td>Inference</td><td>l4t-tensorrt container</td><td>keeps the host clean</td></tr><tr><td>Deployment</td><td>Docker + systemd</td><td>always-on edge service</td></tr></tbody></table>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
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
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('multi-source-download', '多源分段下载：什么时候多连接有用，什么时候没用（aria2 实测）', '同一个大文件，用多镜像、多连接分段下载到底能快多少？实测单连接、curl 多连接、aria2 多源分段，并给出判断瓶颈与正确配置的方法。', '<p>下载一个大文件很慢时，先别急着&quot;多加连接&quot;。慢有两种完全不同的原因：</p>
<ul><li><strong>单连接被限速</strong>（服务器/代理对每个连接限速）→ 多连接有用；</li><li><strong>总带宽到顶</strong>（你的线路就那么大）→ 多连接没用。</li></ul>
<p>分不清这两者，就容易白折腾。下面用真实数据讲清楚，并给出 <code>aria2</code> 的多源分段用法。</p>
<h2>一、先判断瓶颈在哪</h2>
<p>方法很简单：<strong>对比单连接与多连接的聚合速度</strong>。</p>
<ul><li>多连接聚合 ≈ N × 单连接 → 单连接被限速，加连接有效；</li><li>聚合到某个值后不再涨 → 总带宽到顶，加连接无益。</li></ul>
<p>实测（同一文件，20MB range，2026-09）：</p>
<table><thead><tr><th>方式</th><th>速度</th><th>说明</th></tr></thead><tbody><tr><td>单连接（ghproxy.net）</td><td>1.19 MB/s</td><td>单连接上限</td></tr><tr><td>curl 6 连接并行</td><td>~6 MB/s</td><td>聚合到 ~6 就不再涨</td></tr><tr><td>aria2 3 镜像 × 8 连接 × 2 文件</td><td>~6 MB/s</td><td>同上，说明是<strong>总带宽到顶</strong></td></tr></tbody></table>
<p>结论：这台机器的总带宽约 6 MB/s（~48 Mbps）。<strong>多连接/多源把单连接上限填满后就到顶了</strong>，再加连接不会更快。</p>
<blockquote><p>如果你的线路是 500Mbps、而单连接只有 1MB/s，那多连接就能拉到几十 MB/s——这才是多源分段的主场。</p></blockquote>
<h2>二、什么时候多源分段真的有用</h2>
<ul><li>单连接被<strong>服务器/代理限速</strong>（网盘、部分 CDN、GitHub 代理很常见）；</li><li>需要<strong>聚合多个镜像</strong>（各镜像限速不同，取长补短）；</li><li>大文件、且服务器支持 <strong>HTTP Range</strong>；</li><li>断点续传（大文件下载中断后不用重来）。</li></ul>
<p>反例：线路本身到顶、或服务器不支持 Range，多连接/多源都帮不上。</p>
<h2>三、aria2 用法</h2>
<p><code>aria2c</code> 是这方面的标准工具，关键参数：</p>
<table><thead><tr><th>参数</th><th>含义</th></tr></thead><tbody><tr><td><code>-x N</code></td><td>每个服务器最大连接数</td></tr><tr><td><code>-s N</code></td><td>单个文件分成几段</td></tr><tr><td><code>-k SIZE</code></td><td>最小分片大小（如 <code>1M</code>）</td></tr><tr><td><code>-j N</code></td><td>同时下载几个文件</td></tr><tr><td><code>-c</code></td><td>断点续传</td></tr><tr><td>多个 URI</td><td>同一文件的多个镜像</td></tr></tbody></table>
<p><strong>单文件多镜像</strong>：</p>
<pre><code class="language-bash">aria2c -x 8 -s 8 -k 1M -c \
  &quot;https://mirror-a.example/file.bin&quot; \
  &quot;https://mirror-b.example/file.bin&quot; \
  &quot;https://mirror-c.example/file.bin&quot; \
  -o file.bin</code></pre>
<p><strong>多文件（输入文件格式）</strong>：每个条目可列多个镜像 URI，然后跟缩进选项：</p>
<pre><code>https://mirror-a.example/file1
https://mirror-b.example/file1
  out=file1
https://mirror-a.example/file2
https://mirror-b.example/file2
  out=file2</code></pre>
<pre><code class="language-bash">aria2c -c -j 2 -x 8 -s 8 -k 1M --file-allocation=none -i dl.aria2</code></pre>
<p><code>-j 2 -x 8</code> 表示同时下 2 个文件、每个最多 8 连接（每个镜像）。</p>
<h2>四、别忘了校验</h2>
<p>第三方镜像/代理不可全信，下载完<strong>必须校验哈希</strong>：</p>
<pre><code class="language-bash">sha256sum -c SHA256SUMS</code></pre>
<p><code>aria2</code> 自带 <code>--checksum</code> 也可：</p>
<pre><code class="language-bash">aria2c --checksum=sha-256=&lt;hex&gt; ...</code></pre>
<h2>五、注意</h2>
<ul><li>别把服务器打爆：连接数适度（一般 8–16），尊重对方的限速与 ToS；</li><li>确认服务器支持 Range，否则无法分段；</li><li>总带宽到顶时，多连接没有意义——先测再调；</li><li>这个技巧与&quot;国内/国外&quot;无关：<strong>大模型权重、数据集、CI 产物、镜像同步</strong>都用得上。</li></ul>
<h2>小结</h2>
<ol><li>先测：单连接 vs 多连接聚合，判断是&quot;被限速&quot;还是&quot;带宽到顶&quot;。</li></ol>
<ol><li>被限速/多镜像 → 用 <code>aria2 -x -s</code> 多源分段。</li></ol>
<ol><li>带宽到顶 → 换更快线路，而不是加连接。</li></ol>
<ol><li>永远校验哈希。</li></ol>', '---
title: "多源分段下载：什么时候多连接有用，什么时候没用（aria2 实测）"
date: 2026-09-14
tags: ["aria2", "网络", "工程效率"]
summary: "同一个大文件，用多镜像、多连接分段下载到底能快多少？实测单连接、curl 多连接、aria2 多源分段，并给出判断瓶颈与正确配置的方法。"
series: "工程效率"
published: true
---

下载一个大文件很慢时，先别急着"多加连接"。慢有两种完全不同的原因：

- **单连接被限速**（服务器/代理对每个连接限速）→ 多连接有用；
- **总带宽到顶**（你的线路就那么大）→ 多连接没用。

分不清这两者，就容易白折腾。下面用真实数据讲清楚，并给出 `aria2` 的多源分段用法。

## 一、先判断瓶颈在哪

方法很简单：**对比单连接与多连接的聚合速度**。

- 多连接聚合 ≈ N × 单连接 → 单连接被限速，加连接有效；
- 聚合到某个值后不再涨 → 总带宽到顶，加连接无益。

实测（同一文件，20MB range，2026-09）：

| 方式 | 速度 | 说明 |
| --- | --- | --- |
| 单连接（ghproxy.net） | 1.19 MB/s | 单连接上限 |
| curl 6 连接并行 | ~6 MB/s | 聚合到 ~6 就不再涨 |
| aria2 3 镜像 × 8 连接 × 2 文件 | ~6 MB/s | 同上，说明是**总带宽到顶** |

结论：这台机器的总带宽约 6 MB/s（~48 Mbps）。**多连接/多源把单连接上限填满后就到顶了**，再加连接不会更快。

> 如果你的线路是 500Mbps、而单连接只有 1MB/s，那多连接就能拉到几十 MB/s——这才是多源分段的主场。

## 二、什么时候多源分段真的有用

- 单连接被**服务器/代理限速**（网盘、部分 CDN、GitHub 代理很常见）；
- 需要**聚合多个镜像**（各镜像限速不同，取长补短）；
- 大文件、且服务器支持 **HTTP Range**；
- 断点续传（大文件下载中断后不用重来）。

反例：线路本身到顶、或服务器不支持 Range，多连接/多源都帮不上。

## 三、aria2 用法

`aria2c` 是这方面的标准工具，关键参数：

| 参数 | 含义 |
| --- | --- |
| `-x N` | 每个服务器最大连接数 |
| `-s N` | 单个文件分成几段 |
| `-k SIZE` | 最小分片大小（如 `1M`） |
| `-j N` | 同时下载几个文件 |
| `-c` | 断点续传 |
| 多个 URI | 同一文件的多个镜像 |

**单文件多镜像**：
```bash
aria2c -x 8 -s 8 -k 1M -c \
  "https://mirror-a.example/file.bin" \
  "https://mirror-b.example/file.bin" \
  "https://mirror-c.example/file.bin" \
  -o file.bin
```

**多文件（输入文件格式）**：每个条目可列多个镜像 URI，然后跟缩进选项：
```
https://mirror-a.example/file1
https://mirror-b.example/file1
  out=file1
https://mirror-a.example/file2
https://mirror-b.example/file2
  out=file2
```
```bash
aria2c -c -j 2 -x 8 -s 8 -k 1M --file-allocation=none -i dl.aria2
```

`-j 2 -x 8` 表示同时下 2 个文件、每个最多 8 连接（每个镜像）。

## 四、别忘了校验

第三方镜像/代理不可全信，下载完**必须校验哈希**：

```bash
sha256sum -c SHA256SUMS
```

`aria2` 自带 `--checksum` 也可：
```bash
aria2c --checksum=sha-256=<hex> ...
```

## 五、注意

- 别把服务器打爆：连接数适度（一般 8–16），尊重对方的限速与 ToS；
- 确认服务器支持 Range，否则无法分段；
- 总带宽到顶时，多连接没有意义——先测再调；
- 这个技巧与"国内/国外"无关：**大模型权重、数据集、CI 产物、镜像同步**都用得上。

## 小结

1. 先测：单连接 vs 多连接聚合，判断是"被限速"还是"带宽到顶"。
2. 被限速/多镜像 → 用 `aria2 -x -s` 多源分段。
3. 带宽到顶 → 换更快线路，而不是加连接。
4. 永远校验哈希。
', '工程效率', 1, '2026-09-14', '2026-10-08T22:38:26.724Z', 'Multi-Source Segmented Downloads: When More Connections Help (and When They Don''t)', 'How much faster is a large download with multiple mirrors and connections? Measured single connection, parallel curl, and aria2 multi-source — plus how to find the real bottleneck.', 'When a big download is slow, don''t just "add more connections". There are two completely different causes:

- **Per-connection throttling** (the server/proxy rate-limits each connection) → more connections help;
- **Link saturation** (your pipe is simply maxed out) → more connections don''t help.

Confusing the two wastes time. Here''s how to tell them apart, with real numbers, and how to use `aria2` for multi-source segmented downloads.

## 1. Find the bottleneck first

The method is simple: **compare single-connection vs. aggregate speed**.

- Aggregate ≈ N × single → per-connection throttling; more connections help.
- Aggregate plateaus → link saturation; more connections won''t help.

Measured (same file, 20 MB range, 2026-09):

| Method | Speed | Notes |
| --- | --- | --- |
| Single connection (ghproxy.net) | 1.19 MB/s | per-connection ceiling |
| curl, 6 parallel connections | ~6 MB/s | plateaus at ~6 |
| aria2, 3 mirrors × 8 conn × 2 files | ~6 MB/s | same → **link is saturated** |

Conclusion: this machine''s link is ~6 MB/s (~48 Mbps). Multi-connection/multi-source fills the per-connection ceiling and then stops. More connections won''t help.

> If your link is 500 Mbps but a single connection only gets 1 MB/s, multi-connection can push it to tens of MB/s — that''s where multi-source shines.

## 2. When multi-source segmented download actually helps

- Per-connection throttling by the server/proxy (common with file hosts, some CDNs, GitHub proxies);
- Aggregating **multiple mirrors** with different limits;
- Large files where the server supports **HTTP Range**;
- Resumable downloads (no restart after an interruption).

Counterexamples: a saturated link, or a server without Range support — neither benefits.

## 3. Using aria2

`aria2c` is the standard tool. Key options:

| Option | Meaning |
| --- | --- |
| `-x N` | max connections per server |
| `-s N` | number of segments per file |
| `-k SIZE` | minimum split size (e.g. `1M`) |
| `-j N` | concurrent files |
| `-c` | resume |
| multiple URIs | mirrors for the same file |

**One file, multiple mirrors**:
```bash
aria2c -x 8 -s 8 -k 1M -c \
  "https://mirror-a.example/file.bin" \
  "https://mirror-b.example/file.bin" \
  "https://mirror-c.example/file.bin" \
  -o file.bin
```

**Many files (input file format)** — each entry may list several mirror URIs, then indented options:
```
https://mirror-a.example/file1
https://mirror-b.example/file1
  out=file1
https://mirror-a.example/file2
https://mirror-b.example/file2
  out=file2
```
```bash
aria2c -c -j 2 -x 8 -s 8 -k 1M --file-allocation=none -i dl.aria2
```

`-j 2 -x 8` means 2 files at a time, up to 8 connections each (per mirror).

## 4. Always verify

Third-party mirrors/proxies shouldn''t be fully trusted — **verify the hash**:

```bash
sha256sum -c SHA256SUMS
```

aria2 can also verify inline:
```bash
aria2c --checksum=sha-256=<hex> ...
```

## 5. Caveats

- Don''t hammer servers: keep connections moderate (8–16) and respect rate limits/ToS.
- Confirm the server supports Range, or segmentation is impossible.
- If the link is saturated, more connections are pointless — measure before tuning.
- This is not a China-specific trick: it applies to **model weights, datasets, CI artifacts, mirror sync**, anywhere.

## Summary

1. Measure: single vs. aggregate to find "throttled" or "saturated".
2. Throttled / multiple mirrors → use `aria2 -x -s` multi-source segments.
3. Saturated → get a faster link, not more connections.
4. Always verify hashes.
', '<p>When a big download is slow, don&#39;t just &quot;add more connections&quot;. There are two completely different causes:</p>
<ul><li><strong>Per-connection throttling</strong> (the server/proxy rate-limits each connection) → more connections help;</li><li><strong>Link saturation</strong> (your pipe is simply maxed out) → more connections don&#39;t help.</li></ul>
<p>Confusing the two wastes time. Here&#39;s how to tell them apart, with real numbers, and how to use <code>aria2</code> for multi-source segmented downloads.</p>
<h2>1. Find the bottleneck first</h2>
<p>The method is simple: <strong>compare single-connection vs. aggregate speed</strong>.</p>
<ul><li>Aggregate ≈ N × single → per-connection throttling; more connections help.</li><li>Aggregate plateaus → link saturation; more connections won&#39;t help.</li></ul>
<p>Measured (same file, 20 MB range, 2026-09):</p>
<table><thead><tr><th>Method</th><th>Speed</th><th>Notes</th></tr></thead><tbody><tr><td>Single connection (ghproxy.net)</td><td>1.19 MB/s</td><td>per-connection ceiling</td></tr><tr><td>curl, 6 parallel connections</td><td>~6 MB/s</td><td>plateaus at ~6</td></tr><tr><td>aria2, 3 mirrors × 8 conn × 2 files</td><td>~6 MB/s</td><td>same → <strong>link is saturated</strong></td></tr></tbody></table>
<p>Conclusion: this machine&#39;s link is ~6 MB/s (~48 Mbps). Multi-connection/multi-source fills the per-connection ceiling and then stops. More connections won&#39;t help.</p>
<blockquote><p>If your link is 500 Mbps but a single connection only gets 1 MB/s, multi-connection can push it to tens of MB/s — that&#39;s where multi-source shines.</p></blockquote>
<h2>2. When multi-source segmented download actually helps</h2>
<ul><li>Per-connection throttling by the server/proxy (common with file hosts, some CDNs, GitHub proxies);</li><li>Aggregating <strong>multiple mirrors</strong> with different limits;</li><li>Large files where the server supports <strong>HTTP Range</strong>;</li><li>Resumable downloads (no restart after an interruption).</li></ul>
<p>Counterexamples: a saturated link, or a server without Range support — neither benefits.</p>
<h2>3. Using aria2</h2>
<p><code>aria2c</code> is the standard tool. Key options:</p>
<table><thead><tr><th>Option</th><th>Meaning</th></tr></thead><tbody><tr><td><code>-x N</code></td><td>max connections per server</td></tr><tr><td><code>-s N</code></td><td>number of segments per file</td></tr><tr><td><code>-k SIZE</code></td><td>minimum split size (e.g. <code>1M</code>)</td></tr><tr><td><code>-j N</code></td><td>concurrent files</td></tr><tr><td><code>-c</code></td><td>resume</td></tr><tr><td>multiple URIs</td><td>mirrors for the same file</td></tr></tbody></table>
<p><strong>One file, multiple mirrors</strong>:</p>
<pre><code class="language-bash">aria2c -x 8 -s 8 -k 1M -c \
  &quot;https://mirror-a.example/file.bin&quot; \
  &quot;https://mirror-b.example/file.bin&quot; \
  &quot;https://mirror-c.example/file.bin&quot; \
  -o file.bin</code></pre>
<p><strong>Many files (input file format)</strong> — each entry may list several mirror URIs, then indented options:</p>
<pre><code>https://mirror-a.example/file1
https://mirror-b.example/file1
  out=file1
https://mirror-a.example/file2
https://mirror-b.example/file2
  out=file2</code></pre>
<pre><code class="language-bash">aria2c -c -j 2 -x 8 -s 8 -k 1M --file-allocation=none -i dl.aria2</code></pre>
<p><code>-j 2 -x 8</code> means 2 files at a time, up to 8 connections each (per mirror).</p>
<h2>4. Always verify</h2>
<p>Third-party mirrors/proxies shouldn&#39;t be fully trusted — <strong>verify the hash</strong>:</p>
<pre><code class="language-bash">sha256sum -c SHA256SUMS</code></pre>
<p>aria2 can also verify inline:</p>
<pre><code class="language-bash">aria2c --checksum=sha-256=&lt;hex&gt; ...</code></pre>
<h2>5. Caveats</h2>
<ul><li>Don&#39;t hammer servers: keep connections moderate (8–16) and respect rate limits/ToS.</li><li>Confirm the server supports Range, or segmentation is impossible.</li><li>If the link is saturated, more connections are pointless — measure before tuning.</li><li>This is not a China-specific trick: it applies to <strong>model weights, datasets, CI artifacts, mirror sync</strong>, anywhere.</li></ul>
<h2>Summary</h2>
<ol><li>Measure: single vs. aggregate to find &quot;throttled&quot; or &quot;saturated&quot;.</li></ol>
<ol><li>Throttled / multiple mirrors → use <code>aria2 -x -s</code> multi-source segments.</li></ol>
<ol><li>Saturated → get a faster link, not more connections.</li></ol>
<ol><li>Always verify hashes.</li></ol>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('aria2') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'multi-source-download' AND t.name = 'aria2'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('网络') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'multi-source-download' AND t.name = '网络'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('工程效率') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'multi-source-download' AND t.name = '工程效率'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
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
', 'OpenWrt 编译入门', 1, '2026-07-10', '2026-10-08T22:38:26.725Z', 'OpenWrt ImageBuilder: Custom Firmware in a Few Commands', 'Add packages and repack an official firmware image with the OpenWrt ImageBuilder in minutes, without compiling the whole source tree.', 'The most common question when starting with OpenWrt is: "I don''t want to build the entire source tree just to add a couple of packages." The official **ImageBuilder** exists exactly for that: it only repackages, it does not recompile the kernel.

> Assumptions: host Ubuntu 22.04 / Debian 12, target **x86_64**, OpenWrt **23.05.5**.

## 1. Download the ImageBuilder for your target

```bash
cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64
```

## 2. Inspect the available packages

The ImageBuilder ships a `packages` index, so you can simply `grep`:

```bash
make info | grep -i luci
# common: luci luci-ssl-openssl luci-app-* etc.
```

Note: the ImageBuilder only includes packages that are in sync with the official feeds. To add a self-compiled `.ipk`, drop it into the `packages/` directory before running `make`.

## 3. Build a firmware with extra packages

```bash
make image \
  PROFILE=generic \
  PACKAGES="luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs"
```

The resulting image lives under `bin/targets/x86/64/`:

```text
openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz
```

Before flashing, remember:

```bash
gzip -dk openwrt-*.img.gz
# For x86 you can validate with qemu or a disk writer (dd / balenaEtcher)
```

## 4. Getting your own package onto the image

Self-compiled `.ipk` files can be installed with `opkg`, no repackaging needed:

```bash
scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 "opkg install /tmp/mypackage_1.0_1_x86_64.ipk"
```

## Wrap-up

| Scenario | Recommended tool |
| --- | --- |
| Only official packages, fast repack | ImageBuilder |
| Deep kernel/driver customization | Source build (SDK) |
| Everyday package management | opkg online install |

Next up: trimming the kernel with `menuconfig` when building from source.
', '<p>The most common question when starting with OpenWrt is: &quot;I don&#39;t want to build the entire source tree just to add a couple of packages.&quot; The official <strong>ImageBuilder</strong> exists exactly for that: it only repackages, it does not recompile the kernel.</p>
<blockquote><p>Assumptions: host Ubuntu 22.04 / Debian 12, target <strong>x86_64</strong>, OpenWrt <strong>23.05.5</strong>.</p></blockquote>
<h2>1. Download the ImageBuilder for your target</h2>
<pre><code class="language-bash">cd ~/openwrt
wget https://downloads.openwrt.org/releases/23.05.5/targets/x86/64/openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64.tar.xz
tar xf openwrt-imagebuilder-*.tar.xz
cd openwrt-imagebuilder-23.05.5-x86-64.Linux-x86_64</code></pre>
<h2>2. Inspect the available packages</h2>
<p>The ImageBuilder ships a <code>packages</code> index, so you can simply <code>grep</code>:</p>
<pre><code class="language-bash">make info | grep -i luci
# common: luci luci-ssl-openssl luci-app-* etc.</code></pre>
<p>Note: the ImageBuilder only includes packages that are in sync with the official feeds. To add a self-compiled <code>.ipk</code>, drop it into the <code>packages/</code> directory before running <code>make</code>.</p>
<h2>3. Build a firmware with extra packages</h2>
<pre><code class="language-bash">make image \
  PROFILE=generic \
  PACKAGES=&quot;luci luci-ssl-openssl kmod-usb-storage block-mount e2fsprogs&quot;</code></pre>
<p>The resulting image lives under <code>bin/targets/x86/64/</code>:</p>
<pre><code class="language-text">openwrt-23.05.5-x86-64-generic-squashfs-combined-efi.img.gz</code></pre>
<p>Before flashing, remember:</p>
<pre><code class="language-bash">gzip -dk openwrt-*.img.gz
# For x86 you can validate with qemu or a disk writer (dd / balenaEtcher)</code></pre>
<h2>4. Getting your own package onto the image</h2>
<p>Self-compiled <code>.ipk</code> files can be installed with <code>opkg</code>, no repackaging needed:</p>
<pre><code class="language-bash">scp mypackage_1.0_1_x86_64.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 &quot;opkg install /tmp/mypackage_1.0_1_x86_64.ipk&quot;</code></pre>
<h2>Wrap-up</h2>
<table><thead><tr><th>Scenario</th><th>Recommended tool</th></tr></thead><tbody><tr><td>Only official packages, fast repack</td><td>ImageBuilder</td></tr><tr><td>Deep kernel/driver customization</td><td>Source build (SDK)</td></tr><tr><td>Everyday package management</td><td>opkg online install</td></tr></tbody></table>
<p>Next up: trimming the kernel with <code>menuconfig</code> when building from source.</p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('openwrt') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'openwrt-imagebuilder-quickstart' AND t.name = 'openwrt'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('固件编译') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'openwrt-imagebuilder-quickstart' AND t.name = '固件编译'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('sdk-esdk-sstate', 'sstate / SDK / eSDK：Yocto 里三个最容易搞混的东西', 'sstate 是给构建机的缓存，SDK 是给开发者的工具链，eSDK 是两者打包。弄清这三个，才知道本地开发该怎么下手。', '<p>在 Yocto 里做开发，绕不开三个词：<strong>sstate、SDK、eSDK</strong>。它们经常被混着说，其实是<strong>三样不同的东西</strong>。一句话先分清：</p>
<blockquote><p><strong><code>sstate</code> 是&quot;给构建机的缓存&quot;，<code>SDK</code> 是&quot;给开发者的工具链&quot;，<code>eSDK</code> 是&quot;把两者打包，给系统开发者离线用&quot;。</strong></p></blockquote>
<h2>一、对比</h2>
<table><thead><tr><th></th><th><code>sstate</code></th><th><code>SDK</code></th><th><code>eSDK</code>（可扩展 SDK）</th></tr></thead><tbody><tr><td>是什么</td><td>任务中间产物的<strong>缓存</strong>（对象文件、sysroot、native 工具、rpm 包…）</td><td>可安装的<strong>交叉工具链 + 镜像的目标 sysroot</strong></td><td><strong>SDK + 该镜像所需的 sstate 子集 + bitbake + devtool</strong></td></tr><tr><td>给谁用</td><td><strong>bitbake 自己</strong></td><td><strong>应用开发者</strong></td><td><strong>系统/发行版开发者</strong></td></tr><tr><td>能干什么</td><td>跳过重编（命中即复用）</td><td>交叉编译应用、链接镜像里的库</td><td><strong>离线</strong> <code>devtool</code> 改/加 recipe、重编</td></tr><tr><td>含 bitbake / devtool</td><td>❌</td><td>❌</td><td>✅</td></tr><tr><td>能离线改构建</td><td>❌</td><td>❌</td><td>✅</td></tr><tr><td>典型体积</td><td><strong>最大</strong>（15–40GB）</td><td>中（~1–3GB）</td><td>大（数 GB）</td></tr><tr><td>怎么生成</td><td>每次构建自动写</td><td><code>bitbake &lt;image&gt; -c populate_sdk</code></td><td><code>bitbake &lt;image&gt; -c populate_sdk_ext</code></td></tr></tbody></table>
<h2>二、它们的关系（不是简单的&quot;子集&quot;）</h2>
<ul><li><strong><code>sstate</code></strong>：内容寻址的缓存，本质是&quot;<strong>原料仓库</strong>&quot;——不是给人用的成品，而是一堆哈希目录。</li><li><strong><code>SDK</code></strong>：从镜像的 sysroot 打包出的<strong>成品工具链</strong>——拿到别的机器装完就能编应用，但<strong>不含构建系统</strong>。</li><li><strong><code>eSDK</code></strong>：在 SDK 基础上<strong>塞进该镜像所需的 sstate 子集 + bitbake 元数据 + devtool</strong>，于是<strong>离线也能改 recipe、重编</strong>。</li></ul>
<blockquote><p>类比：<code>sstate</code> = 车间仓库；<code>SDK</code> = 一套精巧工具；<code>eSDK</code> = <strong>带料的工具箱</strong>（工具 + 够用的原料 + 说明）。</p></blockquote>
<h2>三、怎么选</h2>
<table><thead><tr><th>场景</th><th>用什么</th></tr></thead><tbody><tr><td>本地已有构建树、只改单个 recipe</td><td><strong><code>sstate</code> + <code>devtool</code></strong>（最轻）</td></tr><tr><td>只想交叉编个应用、链接镜像里的库</td><td><strong><code>SDK</code></strong></td></tr><tr><td>本地不想跑全量、要<strong>离线</strong>改 recipe/加包</td><td><strong><code>eSDK</code></strong></td></tr><tr><td>换新机器 / 无网环境做开发</td><td><strong><code>eSDK</code></strong></td></tr></tbody></table>
<h2>四、我们走过的坑（经验）</h2>
<ul><li><strong>体积</strong>：<code>eSDK</code> 和 <code>sstate</code> 都可能好几 GB → 放对象存储/Release 时要<strong>分卷（单文件 &lt;2GiB）</strong>；慢网下载也慢。</li><li><strong>配置必须一致</strong>：eSDK 与目标必须同 distro/machine。改过 <code>DISTRO_FEATURES</code> 这类全局项后，旧 SDK/sstate 里的签名就对不上了。</li><li><strong>eSDK 是快照</strong>：它的元数据是&quot;拍下来的&quot;，<strong>加新 layer / 大改配置</strong>仍需回 CI 重出。</li><li><strong>原则</strong>：<strong>CI 编全量 → 本地只做增量</strong>。本地两条路径：① 构建树 + 拉 sstate + <code>devtool</code>；② 装 eSDK（重一次，之后完全离线）。</li></ul>
<h2>五、一句话总结</h2>
<p><strong>别把 sstate 当 SDK 用，也别指望 SDK 能改构建。</strong> 想清楚你是&quot;编应用&quot;还是&quot;改发行版&quot;，再决定装哪个：应用开发者要 <code>SDK</code>，系统开发者要 <code>eSDK</code>，而 <code>sstate</code> 永远只是背后那个让构建变快的缓存。</p>', '---
title: "sstate / SDK / eSDK：Yocto 里三个最容易搞混的东西"
date: 2026-09-28
tags: ["yocto", "sdk", "esdk", "sstate", "构建"]
summary: "sstate 是给构建机的缓存，SDK 是给开发者的工具链，eSDK 是两者打包。弄清这三个，才知道本地开发该怎么下手。"
series: "AI 网关实战"
published: true
---

在 Yocto 里做开发，绕不开三个词：**sstate、SDK、eSDK**。它们经常被混着说，其实是**三样不同的东西**。一句话先分清：

> **`sstate` 是"给构建机的缓存"，`SDK` 是"给开发者的工具链"，`eSDK` 是"把两者打包，给系统开发者离线用"。**

## 一、对比

| | `sstate` | `SDK` | `eSDK`（可扩展 SDK） |
| --- | --- | --- | --- |
| 是什么 | 任务中间产物的**缓存**（对象文件、sysroot、native 工具、rpm 包…） | 可安装的**交叉工具链 + 镜像的目标 sysroot** | **SDK + 该镜像所需的 sstate 子集 + bitbake + devtool** |
| 给谁用 | **bitbake 自己** | **应用开发者** | **系统/发行版开发者** |
| 能干什么 | 跳过重编（命中即复用） | 交叉编译应用、链接镜像里的库 | **离线** `devtool` 改/加 recipe、重编 |
| 含 bitbake / devtool | ❌ | ❌ | ✅ |
| 能离线改构建 | ❌ | ❌ | ✅ |
| 典型体积 | **最大**（15–40GB） | 中（~1–3GB） | 大（数 GB） |
| 怎么生成 | 每次构建自动写 | `bitbake <image> -c populate_sdk` | `bitbake <image> -c populate_sdk_ext` |

## 二、它们的关系（不是简单的"子集"）

- **`sstate`**：内容寻址的缓存，本质是"**原料仓库**"——不是给人用的成品，而是一堆哈希目录。
- **`SDK`**：从镜像的 sysroot 打包出的**成品工具链**——拿到别的机器装完就能编应用，但**不含构建系统**。
- **`eSDK`**：在 SDK 基础上**塞进该镜像所需的 sstate 子集 + bitbake 元数据 + devtool**，于是**离线也能改 recipe、重编**。

> 类比：`sstate` = 车间仓库；`SDK` = 一套精巧工具；`eSDK` = **带料的工具箱**（工具 + 够用的原料 + 说明）。

## 三、怎么选

| 场景 | 用什么 |
| --- | --- |
| 本地已有构建树、只改单个 recipe | **`sstate` + `devtool`**（最轻） |
| 只想交叉编个应用、链接镜像里的库 | **`SDK`** |
| 本地不想跑全量、要**离线**改 recipe/加包 | **`eSDK`** |
| 换新机器 / 无网环境做开发 | **`eSDK`** |

## 四、我们走过的坑（经验）

- **体积**：`eSDK` 和 `sstate` 都可能好几 GB → 放对象存储/Release 时要**分卷（单文件 <2GiB）**；慢网下载也慢。
- **配置必须一致**：eSDK 与目标必须同 distro/machine。改过 `DISTRO_FEATURES` 这类全局项后，旧 SDK/sstate 里的签名就对不上了。
- **eSDK 是快照**：它的元数据是"拍下来的"，**加新 layer / 大改配置**仍需回 CI 重出。
- **原则**：**CI 编全量 → 本地只做增量**。本地两条路径：① 构建树 + 拉 sstate + `devtool`；② 装 eSDK（重一次，之后完全离线）。

## 五、一句话总结

**别把 sstate 当 SDK 用，也别指望 SDK 能改构建。** 想清楚你是"编应用"还是"改发行版"，再决定装哪个：应用开发者要 `SDK`，系统开发者要 `eSDK`，而 `sstate` 永远只是背后那个让构建变快的缓存。
', 'AI 网关实战', 1, '2026-09-28', '2026-10-08T22:38:26.726Z', 'sstate vs SDK vs eSDK: the three most-confused things in Yocto', 'sstate is a cache for the build machine, SDK is a toolchain for developers, eSDK packs both for offline system development. Here''s how they differ and which one you want.', 'Three words come up constantly in Yocto — **sstate, SDK, eSDK** — and they get mixed up all the time. They are three different things. One line to tell them apart:

> **`sstate` is a cache for the build machine; `SDK` is a toolchain for developers; `eSDK` packs both so system developers can work offline.**

## 1. Comparison

| | `sstate` | `SDK` | `eSDK` (extensible SDK) |
| --- | --- | --- | --- |
| What it is | A **cache of task outputs** (objects, sysroots, native tools, packages…) | An installable **cross toolchain + the image''s target sysroot** | **SDK + the sstate subset needed by that image + bitbake + devtool** |
| For whom | **bitbake itself** | **Application developers** | **System/distro developers** |
| What you can do | Skip re-running tasks on a cache hit | Cross-compile apps against the image''s libs | **Offline** `devtool` modify/build, add recipes |
| Includes bitbake/devtool | ❌ | ❌ | ✅ |
| Can edit the build offline | ❌ | ❌ | ✅ |
| Typical size | **Largest** (15–40GB) | Medium (~1–3GB) | Large (several GB) |
| How to produce | Written automatically per build | `bitbake <image> -c populate_sdk` | `bitbake <image> -c populate_sdk_ext` |

## 2. How they relate (it''s not a simple subset)

- **`sstate`**: a content-addressed cache — essentially a **warehouse of raw materials**, not a usable product, just a pile of hash-named directories.
- **`SDK`**: a **finished toolchain** packaged from the image sysroot — install it on another machine and cross-compile. It does **not** include a build system.
- **`eSDK`**: the SDK **plus the sstate subset for that image, plus bitbake metadata and devtool** — so you can **edit and rebuild recipes offline**.

> Analogy: `sstate` = the warehouse; `SDK` = a nice set of tools; `eSDK` = a **toolbox with materials** (tools + just enough stock + instructions).

## 3. Which one to use

| Scenario | Use |
| --- | --- |
| Local build tree exists, changing one recipe | **`sstate` + `devtool`** (lightest) |
| Just cross-compiling an app against the image | **`SDK`** |
| Don''t want full builds locally; edit recipes **offline** | **`eSDK`** |
| New machine / no network | **`eSDK`** |

## 4. Lessons from the field

- **Size**: both `eSDK` and `sstate` can be many GB → split into **<2GiB parts** for object stores/Releases; slow to pull on slow links.
- **Same config required**: the eSDK must match your distro/machine. Change global knobs like `DISTRO_FEATURES` and old SDK/sstate signatures no longer match.
- **The eSDK is a snapshot**: adding a new layer or making large config changes still means going back to CI.
- **Principle**: **build everything in CI, do only increments locally.** Two local paths: (1) build tree + pulled sstate + `devtool`; (2) install the eSDK once, then work fully offline.

## 5. TL;DR

Don''t treat `sstate` as an SDK, and don''t expect an `SDK` to rebuild recipes. Decide whether you *build an app* or *maintain a distro*: app developers want `SDK`, system developers want `eSDK` — and `sstate` is always just the cache that makes builds fast.
', '<p>Three words come up constantly in Yocto — <strong>sstate, SDK, eSDK</strong> — and they get mixed up all the time. They are three different things. One line to tell them apart:</p>
<blockquote><p><strong><code>sstate</code> is a cache for the build machine; <code>SDK</code> is a toolchain for developers; <code>eSDK</code> packs both so system developers can work offline.</strong></p></blockquote>
<h2>1. Comparison</h2>
<table><thead><tr><th></th><th><code>sstate</code></th><th><code>SDK</code></th><th><code>eSDK</code> (extensible SDK)</th></tr></thead><tbody><tr><td>What it is</td><td>A <strong>cache of task outputs</strong> (objects, sysroots, native tools, packages…)</td><td>An installable <strong>cross toolchain + the image&#39;s target sysroot</strong></td><td><strong>SDK + the sstate subset needed by that image + bitbake + devtool</strong></td></tr><tr><td>For whom</td><td><strong>bitbake itself</strong></td><td><strong>Application developers</strong></td><td><strong>System/distro developers</strong></td></tr><tr><td>What you can do</td><td>Skip re-running tasks on a cache hit</td><td>Cross-compile apps against the image&#39;s libs</td><td><strong>Offline</strong> <code>devtool</code> modify/build, add recipes</td></tr><tr><td>Includes bitbake/devtool</td><td>❌</td><td>❌</td><td>✅</td></tr><tr><td>Can edit the build offline</td><td>❌</td><td>❌</td><td>✅</td></tr><tr><td>Typical size</td><td><strong>Largest</strong> (15–40GB)</td><td>Medium (~1–3GB)</td><td>Large (several GB)</td></tr><tr><td>How to produce</td><td>Written automatically per build</td><td><code>bitbake &lt;image&gt; -c populate_sdk</code></td><td><code>bitbake &lt;image&gt; -c populate_sdk_ext</code></td></tr></tbody></table>
<h2>2. How they relate (it&#39;s not a simple subset)</h2>
<ul><li><strong><code>sstate</code></strong>: a content-addressed cache — essentially a <strong>warehouse of raw materials</strong>, not a usable product, just a pile of hash-named directories.</li><li><strong><code>SDK</code></strong>: a <strong>finished toolchain</strong> packaged from the image sysroot — install it on another machine and cross-compile. It does <strong>not</strong> include a build system.</li><li><strong><code>eSDK</code></strong>: the SDK <strong>plus the sstate subset for that image, plus bitbake metadata and devtool</strong> — so you can <strong>edit and rebuild recipes offline</strong>.</li></ul>
<blockquote><p>Analogy: <code>sstate</code> = the warehouse; <code>SDK</code> = a nice set of tools; <code>eSDK</code> = a <strong>toolbox with materials</strong> (tools + just enough stock + instructions).</p></blockquote>
<h2>3. Which one to use</h2>
<table><thead><tr><th>Scenario</th><th>Use</th></tr></thead><tbody><tr><td>Local build tree exists, changing one recipe</td><td><strong><code>sstate</code> + <code>devtool</code></strong> (lightest)</td></tr><tr><td>Just cross-compiling an app against the image</td><td><strong><code>SDK</code></strong></td></tr><tr><td>Don&#39;t want full builds locally; edit recipes <strong>offline</strong></td><td><strong><code>eSDK</code></strong></td></tr><tr><td>New machine / no network</td><td><strong><code>eSDK</code></strong></td></tr></tbody></table>
<h2>4. Lessons from the field</h2>
<ul><li><strong>Size</strong>: both <code>eSDK</code> and <code>sstate</code> can be many GB → split into <strong>&lt;2GiB parts</strong> for object stores/Releases; slow to pull on slow links.</li><li><strong>Same config required</strong>: the eSDK must match your distro/machine. Change global knobs like <code>DISTRO_FEATURES</code> and old SDK/sstate signatures no longer match.</li><li><strong>The eSDK is a snapshot</strong>: adding a new layer or making large config changes still means going back to CI.</li><li><strong>Principle</strong>: <strong>build everything in CI, do only increments locally.</strong> Two local paths: (1) build tree + pulled sstate + <code>devtool</code>; (2) install the eSDK once, then work fully offline.</li></ul>
<h2>5. TL;DR</h2>
<p>Don&#39;t treat <code>sstate</code> as an SDK, and don&#39;t expect an <code>SDK</code> to rebuild recipes. Decide whether you <em>build an app</em> or <em>maintain a distro</em>: app developers want <code>SDK</code>, system developers want <code>eSDK</code> — and <code>sstate</code> is always just the cache that makes builds fast.</p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sdk-esdk-sstate' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('sdk') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sdk-esdk-sstate' AND t.name = 'sdk'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('esdk') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sdk-esdk-sstate' AND t.name = 'esdk'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('sstate') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sdk-esdk-sstate' AND t.name = 'sstate'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('构建') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sdk-esdk-sstate' AND t.name = '构建'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('sparse-images', '稀疏镜像：为什么 14GB 的镜像其实只有 1GB', 'Yocto 的 ext4 镜像动辄十几 GB，上传却卡在 2GiB 上限——因为它大多是''空洞''。讲清怎么检测稀疏、怎么压缩、发布时该怎么发。', '<p>做嵌入式镜像时你大概见过这种怪事：构建产出一个 <strong>14GB 的 <code>.ext4</code></strong>，但上传到对象存储时却卡在 <strong>单文件 2GiB 上限</strong>；而你心里清楚——<strong>里面的东西根本没那么多</strong>。</p>
<p>这就是<strong>稀疏文件（sparse file）</strong>：<strong>逻辑很大，物理很小</strong>。这篇把它讲透：<strong>怎么检测、怎么压缩、怎么发</strong>。</p>
<h2>一、稀疏文件是什么</h2>
<p>稀疏文件里有大量&quot;空洞（hole）&quot;：<strong>逻辑上占用很大，但全是 0 的区间不分配实际磁盘块</strong>。</p>
<p>所以关键是分清两件事——<strong>逻辑大小 ≠ 物理占用</strong>：</p>
<table><thead><tr><th>工具</th><th>看的是</th></tr></thead><tbody><tr><td><code>ls -l</code> / <code>stat -c %s</code></td><td><strong>逻辑</strong>大小（含空洞，例如 14GB）</td></tr><tr><td><code>du</code> / <code>stat -c %b</code></td><td><strong>物理</strong>占用（真正分配的块，可能只有几百 MB）</td></tr></tbody></table>
<h2>二、为什么 Yocto 镜像这么&quot;稀释&quot;</h2>
<p>Yocto 的 <code>ext4</code> 镜像会按 <strong><code>ROOTFS_SIZE</code></strong>（目标文件系统大小）<strong>预分配</strong>，再把实际内容写进去——<strong>没写满的部分就是空洞</strong>。于是你得到一个&quot;14GB&quot;的文件，里面真正的数据可能只有几百 MB，其余全是 0。</p>
<p>相关变量：<code>IMAGE_ROOTFS_SIZE</code>、<code>IMAGE_OVERHEAD_FACTOR</code>、<code>IMAGE_ROOTFS_EXTRA_SPACE</code>。</p>
<h2>三、怎么&quot;检测&quot;</h2>
<pre><code class="language-bash">ls -lh img.ext4          # 逻辑大小（14G）
du  -h img.ext4          # 物理占用（可能只有几百 M ← 说明稀疏）
stat -c &#39;size=%s  blocks=%b&#39; img.ext4   # 物理 = %b × 512 字节
filefrag -v img.ext4     # 逐段列出 extent / hole</code></pre>
<p><strong>判据</strong>：<code>du</code>（物理）<strong>远小于</strong> <code>ls</code>（逻辑）→ 就是稀疏文件。</p>
<p>更专业的做法是 <code>bmaptool</code>：它生成一张<strong>块映射（.bmap，哪些块非空）</strong>，既能检测，也能用于&quot;只写非空块&quot;的快速刷机。</p>
<h2>四、怎么&quot;压缩&quot;</h2>
<p><strong>思路 1：直接压（简单，但慢）</strong></p>
<pre><code class="language-bash">zstd img.ext4</code></pre>
<p>0 的压缩率极高，14GB 能压到 ~1GB；<strong>缺点</strong>是压缩器要<strong>读完整 14GB 的零</strong>。</p>
<p><strong>思路 2：稀疏感知（推荐）</strong></p>
<pre><code class="language-bash">tar --sparse -cf - img.ext4 | zstd   # tar 直接跳过空洞，再压 → 快
zstd --sparse img.ext4               # zstd 自带稀疏支持
cp --sparse=always a b               # 本地复制保留稀疏
rsync -S a b                         # rsync 保留稀疏</code></pre>
<p><strong>思路 3：刷机最专业：<code>bmaptool</code></strong></p>
<pre><code class="language-bash">bmaptool create img.ext4 -o img.ext4.bmap   # 生成块映射
bmaptool copy   img.ext4 /dev/sdX           # 只写非空块（快、可校验）</code></pre>
<h2>五、发布时该怎么发</h2>
<ol><li><strong>别发&quot;裸稀疏 ext4&quot;</strong>——它又大又空，还卡 2GiB 上限；</li></ol>
<ol><li>发<strong>压缩产物</strong>：<code>*.tegraflash.tar.zst</code>（真正的刷机包）、<code>ext4.zst</code> / <code>ext4.gz</code>，并附 <code>.bmap</code>；</li></ol>
<ol><li><strong>若必须发裸镜像</strong>：先 <code>zstd</code> 再发——大概率 &lt;2GiB，<strong>不用分卷</strong>；</li></ol>
<ol><li>&quot;分卷&quot;是最后手段（把 14GB 的裸 ext4 切成 8 卷很浪费）。</li></ol>
<p>在我们的 Jetson 发行版里，<code>meta-tegra</code> 本来就产出 <code>tegraflash-tar.zst</code>（压缩刷机包，只有 ~1.3GB）；真正&quot;胖&quot;的只有裸 <code>.ext4</code>——所以<strong>发布时直接跳过它</strong>即可。</p>
<h2>六、一句话</h2>
<p><strong>稀疏镜像 = &quot;逻辑大、物理小&quot;</strong>：</p>
<ul><li><strong>检测</strong>：<code>du</code>（物理）vs <code>ls</code>/<code>stat</code>（逻辑），或 <code>filefrag -v</code>、<code>bmaptool create</code>；</li><li><strong>压缩</strong>：<code>zstd</code> 最省事，<code>tar --sparse</code> / <code>zstd --sparse</code> 更快，<code>bmaptool</code> 最专业；</li><li><strong>发布</strong>：<strong>只发压缩产物 + <code>.bmap</code></strong>，别发裸稀疏 <code>.ext4</code>。</li></ul>', '---
title: "稀疏镜像：为什么 14GB 的镜像其实只有 1GB"
date: 2026-09-29
tags: ["yocto", "镜像", "sparse", "压缩", "bmaptool"]
summary: "Yocto 的 ext4 镜像动辄十几 GB，上传却卡在 2GiB 上限——因为它大多是''空洞''。讲清怎么检测稀疏、怎么压缩、发布时该怎么发。"
series: "AI 网关实战"
published: true
---

做嵌入式镜像时你大概见过这种怪事：构建产出一个 **14GB 的 `.ext4`**，但上传到对象存储时却卡在 **单文件 2GiB 上限**；而你心里清楚——**里面的东西根本没那么多**。

这就是**稀疏文件（sparse file）**：**逻辑很大，物理很小**。这篇把它讲透：**怎么检测、怎么压缩、怎么发**。

## 一、稀疏文件是什么

稀疏文件里有大量"空洞（hole）"：**逻辑上占用很大，但全是 0 的区间不分配实际磁盘块**。

所以关键是分清两件事——**逻辑大小 ≠ 物理占用**：

| 工具 | 看的是 |
| --- | --- |
| `ls -l` / `stat -c %s` | **逻辑**大小（含空洞，例如 14GB） |
| `du` / `stat -c %b` | **物理**占用（真正分配的块，可能只有几百 MB） |

## 二、为什么 Yocto 镜像这么"稀释"

Yocto 的 `ext4` 镜像会按 **`ROOTFS_SIZE`**（目标文件系统大小）**预分配**，再把实际内容写进去——**没写满的部分就是空洞**。于是你得到一个"14GB"的文件，里面真正的数据可能只有几百 MB，其余全是 0。

相关变量：`IMAGE_ROOTFS_SIZE`、`IMAGE_OVERHEAD_FACTOR`、`IMAGE_ROOTFS_EXTRA_SPACE`。

## 三、怎么"检测"

```bash
ls -lh img.ext4          # 逻辑大小（14G）
du  -h img.ext4          # 物理占用（可能只有几百 M ← 说明稀疏）
stat -c ''size=%s  blocks=%b'' img.ext4   # 物理 = %b × 512 字节
filefrag -v img.ext4     # 逐段列出 extent / hole
```

**判据**：`du`（物理）**远小于** `ls`（逻辑）→ 就是稀疏文件。

更专业的做法是 `bmaptool`：它生成一张**块映射（.bmap，哪些块非空）**，既能检测，也能用于"只写非空块"的快速刷机。

## 四、怎么"压缩"

**思路 1：直接压（简单，但慢）**

```bash
zstd img.ext4
```

0 的压缩率极高，14GB 能压到 ~1GB；**缺点**是压缩器要**读完整 14GB 的零**。

**思路 2：稀疏感知（推荐）**

```bash
tar --sparse -cf - img.ext4 | zstd   # tar 直接跳过空洞，再压 → 快
zstd --sparse img.ext4               # zstd 自带稀疏支持
cp --sparse=always a b               # 本地复制保留稀疏
rsync -S a b                         # rsync 保留稀疏
```

**思路 3：刷机最专业：`bmaptool`**

```bash
bmaptool create img.ext4 -o img.ext4.bmap   # 生成块映射
bmaptool copy   img.ext4 /dev/sdX           # 只写非空块（快、可校验）
```

## 五、发布时该怎么发

1. **别发"裸稀疏 ext4"**——它又大又空，还卡 2GiB 上限；
2. 发**压缩产物**：`*.tegraflash.tar.zst`（真正的刷机包）、`ext4.zst` / `ext4.gz`，并附 `.bmap`；
3. **若必须发裸镜像**：先 `zstd` 再发——大概率 <2GiB，**不用分卷**；
4. "分卷"是最后手段（把 14GB 的裸 ext4 切成 8 卷很浪费）。

在我们的 Jetson 发行版里，`meta-tegra` 本来就产出 `tegraflash-tar.zst`（压缩刷机包，只有 ~1.3GB）；真正"胖"的只有裸 `.ext4`——所以**发布时直接跳过它**即可。

## 六、一句话

**稀疏镜像 = "逻辑大、物理小"**：

- **检测**：`du`（物理）vs `ls`/`stat`（逻辑），或 `filefrag -v`、`bmaptool create`；
- **压缩**：`zstd` 最省事，`tar --sparse` / `zstd --sparse` 更快，`bmaptool` 最专业；
- **发布**：**只发压缩产物 + `.bmap`**，别发裸稀疏 `.ext4`。
', 'AI 网关实战', 1, '2026-09-29', '2026-10-08T22:38:26.727Z', 'Sparse images: why your 14GB image is really 1GB', 'Yocto ext4 images can be tens of GB yet fail to upload because of a 2GiB per-file limit — because most of the file is holes. How to detect sparse files, compress them, and ship them the right way.', 'If you build embedded images, you have probably seen this: the build produces a **14GB `.ext4`**, but uploading it hits a **2GiB per-file limit** — and you know full well there isn''t that much *stuff* inside.

That''s a **sparse file**: **large logical size, small physical footprint**. Here''s how to **detect**, **compress**, and **ship** it.

## 1. What a sparse file is

A sparse file contains "holes": regions that are logically large but allocate **no real disk blocks** because they''re all zeros.

The key is to separate two numbers — **logical size ≠ physical usage**:

| Tool | What it shows |
| --- | --- |
| `ls -l` / `stat -c %s` | **Logical** size (holes included, e.g. 14GB) |
| `du` / `stat -c %b` | **Physical** usage (actually allocated blocks, maybe a few hundred MB) |

## 2. Why Yocto images are so sparse

A Yocto `ext4` image is **pre-allocated** to a target **`ROOTFS_SIZE`** and then filled with the actual content — everything not written is a hole. So you get a "14GB" file whose real data is a few hundred MB; the rest is zeros.

Relevant variables: `IMAGE_ROOTFS_SIZE`, `IMAGE_OVERHEAD_FACTOR`, `IMAGE_ROOTFS_EXTRA_SPACE`.

## 3. How to detect it

```bash
ls -lh img.ext4          # logical size (14G)
du  -h img.ext4          # physical usage (a few hundred M => sparse)
stat -c ''size=%s  blocks=%b'' img.ext4   # physical = %b * 512 bytes
filefrag -v img.ext4     # list extents / holes per segment
```

**Rule of thumb**: if `du` (physical) is **much smaller** than `ls` (logical), it''s sparse.

The professional route is `bmaptool`: it produces a **block map (`.bmap`) of the non-empty blocks**, useful both for detection and for fast "write only non-empty blocks" flashing.

## 4. How to compress it

**Approach 1: just compress (simple, slow)**

```bash
zstd img.ext4
```

Zeros compress extremely well, so 14GB can shrink to ~1GB — but the compressor must **read all 14GB of zeros**.

**Approach 2: sparse-aware (recommended)**

```bash
tar --sparse -cf - img.ext4 | zstd   # tar skips holes, then compress -> fast
zstd --sparse img.ext4
cp --sparse=always a b               # preserve sparseness when copying
rsync -S a b
```

**Approach 3: the pro tool for flashing: `bmaptool`**

```bash
bmaptool create img.ext4 -o img.ext4.bmap
bmaptool copy   img.ext4 /dev/sdX    # writes only non-empty blocks (fast, verifiable)
```

## 5. How to ship it

1. **Don''t ship the raw sparse ext4** — it''s big, mostly empty, and hits the 2GiB limit;
2. Ship **compressed artifacts**: `*.tegraflash.tar.zst` (the real flashing bundle), `ext4.zst` / `ext4.gz`, plus a `.bmap`;
3. **If you must ship the raw image**: `zstd` it first — likely under 2GiB, **no splitting needed**;
4. Splitting is a last resort (cutting a 14GB raw ext4 into 8 parts is just wasteful).

In our Jetson distro, `meta-tegra` already emits `tegraflash-tar.zst` (a ~1.3GB compressed flashing bundle); the only "fat" artifact is the raw `.ext4` — so we simply **skip it when publishing**.

## 6. TL;DR

**A sparse image is "big logically, small physically":**

- **Detect**: `du` (physical) vs `ls`/`stat` (logical), or `filefrag -v` / `bmaptool create`;
- **Compress**: `zstd` is easiest, `tar --sparse` / `zstd --sparse` are faster, `bmaptool` is the pro option;
- **Ship**: **only compressed artifacts + `.bmap`** — never the raw sparse `.ext4`.
', '<p>If you build embedded images, you have probably seen this: the build produces a <strong>14GB <code>.ext4</code></strong>, but uploading it hits a <strong>2GiB per-file limit</strong> — and you know full well there isn&#39;t that much <em>stuff</em> inside.</p>
<p>That&#39;s a <strong>sparse file</strong>: <strong>large logical size, small physical footprint</strong>. Here&#39;s how to <strong>detect</strong>, <strong>compress</strong>, and <strong>ship</strong> it.</p>
<h2>1. What a sparse file is</h2>
<p>A sparse file contains &quot;holes&quot;: regions that are logically large but allocate <strong>no real disk blocks</strong> because they&#39;re all zeros.</p>
<p>The key is to separate two numbers — <strong>logical size ≠ physical usage</strong>:</p>
<table><thead><tr><th>Tool</th><th>What it shows</th></tr></thead><tbody><tr><td><code>ls -l</code> / <code>stat -c %s</code></td><td><strong>Logical</strong> size (holes included, e.g. 14GB)</td></tr><tr><td><code>du</code> / <code>stat -c %b</code></td><td><strong>Physical</strong> usage (actually allocated blocks, maybe a few hundred MB)</td></tr></tbody></table>
<h2>2. Why Yocto images are so sparse</h2>
<p>A Yocto <code>ext4</code> image is <strong>pre-allocated</strong> to a target <strong><code>ROOTFS_SIZE</code></strong> and then filled with the actual content — everything not written is a hole. So you get a &quot;14GB&quot; file whose real data is a few hundred MB; the rest is zeros.</p>
<p>Relevant variables: <code>IMAGE_ROOTFS_SIZE</code>, <code>IMAGE_OVERHEAD_FACTOR</code>, <code>IMAGE_ROOTFS_EXTRA_SPACE</code>.</p>
<h2>3. How to detect it</h2>
<pre><code class="language-bash">ls -lh img.ext4          # logical size (14G)
du  -h img.ext4          # physical usage (a few hundred M =&gt; sparse)
stat -c &#39;size=%s  blocks=%b&#39; img.ext4   # physical = %b * 512 bytes
filefrag -v img.ext4     # list extents / holes per segment</code></pre>
<p><strong>Rule of thumb</strong>: if <code>du</code> (physical) is <strong>much smaller</strong> than <code>ls</code> (logical), it&#39;s sparse.</p>
<p>The professional route is <code>bmaptool</code>: it produces a <strong>block map (<code>.bmap</code>) of the non-empty blocks</strong>, useful both for detection and for fast &quot;write only non-empty blocks&quot; flashing.</p>
<h2>4. How to compress it</h2>
<p><strong>Approach 1: just compress (simple, slow)</strong></p>
<pre><code class="language-bash">zstd img.ext4</code></pre>
<p>Zeros compress extremely well, so 14GB can shrink to ~1GB — but the compressor must <strong>read all 14GB of zeros</strong>.</p>
<p><strong>Approach 2: sparse-aware (recommended)</strong></p>
<pre><code class="language-bash">tar --sparse -cf - img.ext4 | zstd   # tar skips holes, then compress -&gt; fast
zstd --sparse img.ext4
cp --sparse=always a b               # preserve sparseness when copying
rsync -S a b</code></pre>
<p><strong>Approach 3: the pro tool for flashing: <code>bmaptool</code></strong></p>
<pre><code class="language-bash">bmaptool create img.ext4 -o img.ext4.bmap
bmaptool copy   img.ext4 /dev/sdX    # writes only non-empty blocks (fast, verifiable)</code></pre>
<h2>5. How to ship it</h2>
<ol><li><strong>Don&#39;t ship the raw sparse ext4</strong> — it&#39;s big, mostly empty, and hits the 2GiB limit;</li></ol>
<ol><li>Ship <strong>compressed artifacts</strong>: <code>*.tegraflash.tar.zst</code> (the real flashing bundle), <code>ext4.zst</code> / <code>ext4.gz</code>, plus a <code>.bmap</code>;</li></ol>
<ol><li><strong>If you must ship the raw image</strong>: <code>zstd</code> it first — likely under 2GiB, <strong>no splitting needed</strong>;</li></ol>
<ol><li>Splitting is a last resort (cutting a 14GB raw ext4 into 8 parts is just wasteful).</li></ol>
<p>In our Jetson distro, <code>meta-tegra</code> already emits <code>tegraflash-tar.zst</code> (a ~1.3GB compressed flashing bundle); the only &quot;fat&quot; artifact is the raw <code>.ext4</code> — so we simply <strong>skip it when publishing</strong>.</p>
<h2>6. TL;DR</h2>
<p><strong>A sparse image is &quot;big logically, small physically&quot;:</strong></p>
<ul><li><strong>Detect</strong>: <code>du</code> (physical) vs <code>ls</code>/<code>stat</code> (logical), or <code>filefrag -v</code> / <code>bmaptool create</code>;</li><li><strong>Compress</strong>: <code>zstd</code> is easiest, <code>tar --sparse</code> / <code>zstd --sparse</code> are faster, <code>bmaptool</code> is the pro option;</li><li><strong>Ship</strong>: <strong>only compressed artifacts + <code>.bmap</code></strong> — never the raw sparse <code>.ext4</code>.</li></ul>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sparse-images' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('镜像') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sparse-images' AND t.name = '镜像'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('sparse') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sparse-images' AND t.name = 'sparse'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('压缩') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sparse-images' AND t.name = '压缩'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('bmaptool') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'sparse-images' AND t.name = 'bmaptool'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
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
', 'Yocto 构建系统笔记', 1, '2026-08-01', '2026-10-08T22:38:26.728Z', 'Your First BitBake Recipe: Hello World in a meta- Layer', 'Create a custom layer and a minimal recipe step by step, install your compiled program into a QEMU image, and learn SRC_URI / S / do_compile.', 'Yocto uses a **recipe** (`.bb`) to describe "how source code becomes an installable package". This post walks the full path with a minimal example: build a layer → write a recipe → compile → land in an image.

> Assumptions: `poky` is cloned into `~/poky` on branch `kirkstone` (LTS). Host: Ubuntu 22.04.

## 1. Structure: start with a layer

```bash
cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer
```

The generated `meta-mylayer` already ships an example `recipes-example/example/example_0.1.bb`. A real layer looks like this:

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

## 2. A plain C recipe

`myhello.c` is omitted here (it prints `hello from yocto`). The recipe:

```bitbake
SUMMARY = "Minimal hello program"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=... "

SRC_URI = "file://myhello.c"
S = "${WORKDIR}/sources"
UNPACKDIR = "${S}"   # unpack directory since kirkstone

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig
```

## 3. Build a single recipe

```bash
bitbake myhello
```

The result is under:

```bash
find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello
```

## 4. Put it into an image and run it in QEMU

```bash
# Append to the image of the local target machine
echo ''IMAGE_INSTALL:append = " myhello"'' >> conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64
```

Once booted:

```bash
root@qemux86-64:~# myhello
hello from yocto
```

## Common pitfalls

- Source changes not picked up: check for stale `do_compile` caches, use `bitbake -c cleansstate myhello` when needed.
- `md5=` checksum: compute the real hash with `sha256sum` and replace it.
- Debugging variables: `bitbake -e myhello | grep ^S=`.

Next up: layer priorities and overriding an official recipe with a `.bbappend`.
', '<p>Yocto uses a <strong>recipe</strong> (<code>.bb</code>) to describe &quot;how source code becomes an installable package&quot;. This post walks the full path with a minimal example: build a layer → write a recipe → compile → land in an image.</p>
<blockquote><p>Assumptions: <code>poky</code> is cloned into <code>~/poky</code> on branch <code>kirkstone</code> (LTS). Host: Ubuntu 22.04.</p></blockquote>
<h2>1. Structure: start with a layer</h2>
<pre><code class="language-bash">cd ~/poky
source oe-init-build-env
bitbake-layers create-layer ../meta-mylayer
bitbake-layers add-layer ../meta-mylayer</code></pre>
<p>The generated <code>meta-mylayer</code> already ships an example <code>recipes-example/example/example_0.1.bb</code>. A real layer looks like this:</p>
<pre><code class="language-text">meta-mylayer/
├── conf/layer.conf
└── recipes-example/
    ├── example/example_0.1.bb
    └── myhello/
        ├── myhello_0.1.bb
        └── files/
            └── myhello.c</code></pre>
<h2>2. A plain C recipe</h2>
<p><code>myhello.c</code> is omitted here (it prints <code>hello from yocto</code>). The recipe:</p>
<pre><code class="language-bitbake">SUMMARY = &quot;Minimal hello program&quot;
LICENSE = &quot;MIT&quot;
LIC_FILES_CHKSUM = &quot;file://${COMMON_LICENSE_DIR}/MIT;md5=... &quot;

SRC_URI = &quot;file://myhello.c&quot;
S = &quot;${WORKDIR}/sources&quot;
UNPACKDIR = &quot;${S}&quot;   # unpack directory since kirkstone

do_compile() {
    ${CC} ${CFLAGS} -o myhello myhello.c ${LDFLAGS}
}

do_install() {
    install -d ${D}${bindir}
    install -m 0755 myhello ${D}${bindir}
}

inherit pkgconfig</code></pre>
<h2>3. Build a single recipe</h2>
<pre><code class="language-bash">bitbake myhello</code></pre>
<p>The result is under:</p>
<pre><code class="language-bash">find tmp/work -name myhello -type f
# .../myhello/0.1-r0/image/usr/bin/myhello</code></pre>
<h2>4. Put it into an image and run it in QEMU</h2>
<pre><code class="language-bash"># Append to the image of the local target machine
echo &#39;IMAGE_INSTALL:append = &quot; myhello&quot;&#39; &gt;&gt; conf/local.conf
bitbake core-image-minimal
runqemu qemux86-64</code></pre>
<p>Once booted:</p>
<pre><code class="language-bash">root@qemux86-64:~# myhello
hello from yocto</code></pre>
<h2>Common pitfalls</h2>
<ul><li>Source changes not picked up: check for stale <code>do_compile</code> caches, use <code>bitbake -c cleansstate myhello</code> when needed.</li><li><code>md5=</code> checksum: compute the real hash with <code>sha256sum</code> and replace it.</li><li>Debugging variables: <code>bitbake -e myhello | grep ^S=</code>.</li></ul>
<p>Next up: layer priorities and overriding an official recipe with a <code>.bbappend</code>.</p>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-recipe-hello' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('bitbake') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-recipe-hello' AND t.name = 'bitbake'
  ON CONFLICT DO NOTHING;
INSERT INTO posts (slug, title, summary, content_html, source_md, series, published, created_at, updated_at, title_en, summary_en, body_en, content_html_en)
  VALUES ('yocto-tegra-kas-migration', '把 Tegra/Jetson 的 Yocto 发行版从 git submodule 迁到 KAS，为什么', '用真实仓库 embedai 讲清：多上游层的 Yocto 项目为什么值得从 tegra-demo-distro 式 submodule 切到声明式 KAS——一个 kas.yml 钉住版本、配置即文档、日常只剩三条命令。', '<p>做嵌入式发行版最容易被“层”淹没：OpenEmbedded 的每个功能都是单独的 repo，凑齐一套能构建的树要手工对齐一堆版本。这篇用真实仓库 <a href="https://github.com/zishuowang696/embedai">embedai</a> 复盘我为什么把它的 Tegra/Jetson 发行版从 <strong>git submodule</strong> 迁到 <a href="https://github.com/siemens/kas">KAS</a>。</p>
<blockquote><p>背景：<code>embedai</code> 是为 <strong>Jetson Orin Nano</strong>（<code>jetson-orin-nano-devkit-nvme</code>）做的自建 Yocto 发行版——<code>distro: embedai</code>、目标镜像 <code>embedai-image</code>，上层基于 OE4T 的 <code>meta-tegra</code> 与官方 <code>tegra-demo-distro</code> 基线。</p></blockquote>
<h2>1. 起点：tegra-demo-distro 的 submodule 方案</h2>
<p>NVIDIA 官方（OE4T 维护的 <strong>tegra-demo-distro</strong>）用 git submodule 管理上游层：<code>bitbake</code>、<code>openembedded-core</code>、<code>meta-openembedded</code>、<code>meta-tegra</code>、<code>meta-tegra-community</code>……每层一个 submodule。它把“怎么把一堆 git 仓库拼成一个构建树”这件事，写成了散落的 <code>.gitmodules</code> 配置和一段段 shell 脚本。</p>
<p>这套方案的问题会随仓库数量线性放大：</p>
<ul><li>每个 submodule 要各自 <code>init</code> / <code>update</code>，版本靠 submodule 指针各自漂移，没人保证“这一整套”彼此兼容；</li><li>加一个层 = 改 submodule + 手改 <code>bblayers.conf</code>，两步都容易出错；</li><li>换机器、上 CI，得把整套手工流程再走一遍；</li><li>“为什么这个 commit？”——答案藏在历史里，不在配置里。</li></ul>
<h2>2. 迁移：一个 kas.yml 取代全部手工</h2>
<p>KAS 是“配置即构建”的位：用一份 <code>kas.yml</code> 声明<strong>拉哪些 repo、锁到哪个 commit、启用哪些 layer 及优先级</strong>，再加 <code>machine</code> / <code>distro</code> / <code>target</code>，工具负责把声明的状态变成可构建的目录。<code>embedai</code> 迁移后，整个“多仓库 + 层 + 构建目标”都在 <code>kas.yml</code> 顶层：</p>
<pre><code class="language-yaml">header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:        { prio: 85 }
      meta-python:    { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai</code></pre>
<blockquote><p><code>header.version</code> 对应你本机安装的 KAS 配置版本；例子里写 <code>22</code> 代表较新的配置语法，请以 <a href="https://kas.readthedocs.io">kas 文档</a> 与仓库 <code>kas.yml</code> 实际值为准。</p></blockquote>
<h3>对比</h3>
<table><thead><tr><th>维度</th><th>tegra-demo-distro（git submodule）</th><th>本仓库（KAS）</th></tr></thead><tbody><tr><td>多仓库管理</td><td>每层一个 submodule，逐个子模块 <code>init/update</code>、手工对齐版本</td><td>一个 <code>kas.yml</code> 声明所有 repo + 层，<code>kas checkout</code> 一次搞定</td></tr><tr><td>版本一致性</td><td>依赖 submodule 指针，各自推进、易漂移</td><td>每个 repo 锁到 <strong>commit</strong>，整树是一个可复现快照</td></tr><tr><td>换层 / 加层</td><td>手工改 submodule + 改 bblayers，易错</td><td><code>repos:</code> / <code>layers:</code> 加几行即可</td></tr><tr><td>构建入口</td><td>记一串 bitbake/环境命令</td><td><code>kas build</code> / <code>kas shell</code> / <code>kas dump</code>，配置即文档</td></tr><tr><td>可裁剪性</td><td>在官方 distro 上层层叠叠地改</td><td>distro/image/层都归自建 <code>meta-embedai</code>，想删就删</td></tr><tr><td>CI / 自动化</td><td>脚本难维护</td><td>kas 命令可直接进 GitHub Actions</td></tr></tbody></table>
<h2>3. 日常其实只剩三条命令</h2>
<pre><code>kas checkout   # 拉齐所有层到锁定的 commit
kas build      # 构建目标镜像（embedai-image）
kas shell      # 进 bitbake 环境做细活</code></pre>
<p>排障时常用的还有：</p>
<pre><code>kas dump       # 看解析后的完整配置（机器/distro/层实际生效值）</code></pre>
<p><code>kas build</code> 内部替你完成 <code>bitbake-layers</code> 生成 <code>bblayers.conf</code>、注入 <code>machine</code>/<code>distro</code> 的整套“初始化仪式”。这也意味着：<strong>配置本身就是文档</strong>——任何人拿到仓库，不需要脑内保留一串步骤就能复现构建。</p>
<h2>4. 自建层 meta-embedai：把“自己的东西”收拢一处</h2>
<p><code>embedai</code> 的自有改动全部收在自建层 <code>meta-embedai/</code>：</p>
<pre><code class="language-text">meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # 自定义 distro：embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A 兼容性定制
└── recipes-core/               # 镜像配方（embedai-image）等</code></pre>
<p>好处是边界清晰：上游层保持“干净”，一切覆盖（distro 定义、镜像内容、BSP 补丁）都在自己的层里，删掉不用的东西只动一层。</p>
<h2>5. 可复现，才是发行版最值钱的属性</h2>
<p><code>kas.yml</code> 里每个上游 repo 都锁在完整 commit 上，所以：</p>
<ul><li>换机器、重装环境、进 CI，结果一致；</li><li>出问题时能精准回答“到底是哪个 commit 引入的”；</li><li>升级某个上游 = 改一行 commit，重跑一遍，风险可见。</li></ul>
<h2>6. 想加层？先检索再声明</h2>
<p>以后要接 OpenWrt 相关（或任何 OE 层），流程固定：先在 &lt;https://layers.openembedded.org&gt; 检索合适的 layer → 在 <code>kas.yml</code> 的 <code>repos:</code> 加 repo、<code>layers:</code> 声明路径与优先级 → <code>kas checkout &amp;&amp; kas build</code>。不用再碰 <code>bblayers.conf</code>。</p>
<h2>相关链接</h2>
<ul><li><strong>embedai</strong>（本仓库，含完整 <code>kas.yml</code> 与 <code>meta-embedai/</code>）：&lt;https://github.com/zishuowang696/embedai&gt;</li><li><strong>KAS</strong>（配置/构建工具）：&lt;https://github.com/siemens/kas&gt; · 文档 &lt;https://kas.readthedocs.io&gt;</li><li><strong>tegra-demo-distro</strong>（submodule 方案，本项目前身基线）：&lt;https://github.com/OE4T/tegra-demo-distro&gt;</li><li><strong>meta-tegra</strong>（Jetson BSP 层）：&lt;https://github.com/OE4T/meta-tegra&gt;</li><li><strong>meta-tegra-community</strong>：&lt;https://github.com/OE4T/meta-tegra-community&gt;</li><li><strong>OpenEmbedded Core / bitbake</strong>：&lt;https://github.com/openembedded/openembedded-core&gt;</li><li><strong>meta-openembedded</strong>（meta-oe 等）：&lt;https://github.com/openembedded/meta-openembedded&gt;</li><li><strong>meta-virtualization</strong>：&lt;https://git.yoctoproject.org/meta-virtualization&gt;</li></ul>
<blockquote><p>备忘：接 OpenWrt 系内容前，先在 &lt;https://layers.openembedded.org&gt; 检索，再进 <code>kas.yml</code>。</p></blockquote>', '---
title: "把 Tegra/Jetson 的 Yocto 发行版从 git submodule 迁到 KAS，为什么"
date: 2026-09-07
tags: ["yocto", "tegra", "kas"]
summary: "用真实仓库 embedai 讲清：多上游层的 Yocto 项目为什么值得从 tegra-demo-distro 式 submodule 切到声明式 KAS——一个 kas.yml 钉住版本、配置即文档、日常只剩三条命令。"
published: true
---

做嵌入式发行版最容易被“层”淹没：OpenEmbedded 的每个功能都是单独的 repo，凑齐一套能构建的树要手工对齐一堆版本。这篇用真实仓库 [embedai](https://github.com/zishuowang696/embedai) 复盘我为什么把它的 Tegra/Jetson 发行版从 **git submodule** 迁到 [KAS](https://github.com/siemens/kas)。

> 背景：`embedai` 是为 **Jetson Orin Nano**（`jetson-orin-nano-devkit-nvme`）做的自建 Yocto 发行版——`distro: embedai`、目标镜像 `embedai-image`，上层基于 OE4T 的 `meta-tegra` 与官方 `tegra-demo-distro` 基线。

## 1. 起点：tegra-demo-distro 的 submodule 方案

NVIDIA 官方（OE4T 维护的 **tegra-demo-distro**）用 git submodule 管理上游层：`bitbake`、`openembedded-core`、`meta-openembedded`、`meta-tegra`、`meta-tegra-community`……每层一个 submodule。它把“怎么把一堆 git 仓库拼成一个构建树”这件事，写成了散落的 `.gitmodules` 配置和一段段 shell 脚本。

这套方案的问题会随仓库数量线性放大：

- 每个 submodule 要各自 `init` / `update`，版本靠 submodule 指针各自漂移，没人保证“这一整套”彼此兼容；
- 加一个层 = 改 submodule + 手改 `bblayers.conf`，两步都容易出错；
- 换机器、上 CI，得把整套手工流程再走一遍；
- “为什么这个 commit？”——答案藏在历史里，不在配置里。

## 2. 迁移：一个 kas.yml 取代全部手工

KAS 是“配置即构建”的位：用一份 `kas.yml` 声明**拉哪些 repo、锁到哪个 commit、启用哪些 layer 及优先级**，再加 `machine` / `distro` / `target`，工具负责把声明的状态变成可构建的目录。`embedai` 迁移后，整个“多仓库 + 层 + 构建目标”都在 `kas.yml` 顶层：

```yaml
header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:        { prio: 85 }
      meta-python:    { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai
```

> `header.version` 对应你本机安装的 KAS 配置版本；例子里写 `22` 代表较新的配置语法，请以 [kas 文档](https://kas.readthedocs.io) 与仓库 `kas.yml` 实际值为准。

### 对比

| 维度 | tegra-demo-distro（git submodule） | 本仓库（KAS） |
|------|-----------------------------------|---------------|
| 多仓库管理 | 每层一个 submodule，逐个子模块 `init/update`、手工对齐版本 | 一个 `kas.yml` 声明所有 repo + 层，`kas checkout` 一次搞定 |
| 版本一致性 | 依赖 submodule 指针，各自推进、易漂移 | 每个 repo 锁到 **commit**，整树是一个可复现快照 |
| 换层 / 加层 | 手工改 submodule + 改 bblayers，易错 | `repos:` / `layers:` 加几行即可 |
| 构建入口 | 记一串 bitbake/环境命令 | `kas build` / `kas shell` / `kas dump`，配置即文档 |
| 可裁剪性 | 在官方 distro 上层层叠叠地改 | distro/image/层都归自建 `meta-embedai`，想删就删 |
| CI / 自动化 | 脚本难维护 | kas 命令可直接进 GitHub Actions |

## 3. 日常其实只剩三条命令

```
kas checkout   # 拉齐所有层到锁定的 commit
kas build      # 构建目标镜像（embedai-image）
kas shell      # 进 bitbake 环境做细活
```

排障时常用的还有：

```
kas dump       # 看解析后的完整配置（机器/distro/层实际生效值）
```

`kas build` 内部替你完成 `bitbake-layers` 生成 `bblayers.conf`、注入 `machine`/`distro` 的整套“初始化仪式”。这也意味着：**配置本身就是文档**——任何人拿到仓库，不需要脑内保留一串步骤就能复现构建。

## 4. 自建层 meta-embedai：把“自己的东西”收拢一处

`embedai` 的自有改动全部收在自建层 `meta-embedai/`：

```text
meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # 自定义 distro：embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A 兼容性定制
└── recipes-core/               # 镜像配方（embedai-image）等
```

好处是边界清晰：上游层保持“干净”，一切覆盖（distro 定义、镜像内容、BSP 补丁）都在自己的层里，删掉不用的东西只动一层。

## 5. 可复现，才是发行版最值钱的属性

`kas.yml` 里每个上游 repo 都锁在完整 commit 上，所以：

- 换机器、重装环境、进 CI，结果一致；
- 出问题时能精准回答“到底是哪个 commit 引入的”；
- 升级某个上游 = 改一行 commit，重跑一遍，风险可见。

## 6. 想加层？先检索再声明

以后要接 OpenWrt 相关（或任何 OE 层），流程固定：先在 <https://layers.openembedded.org> 检索合适的 layer → 在 `kas.yml` 的 `repos:` 加 repo、`layers:` 声明路径与优先级 → `kas checkout && kas build`。不用再碰 `bblayers.conf`。

## 相关链接

- **embedai**（本仓库，含完整 `kas.yml` 与 `meta-embedai/`）：<https://github.com/zishuowang696/embedai>
- **KAS**（配置/构建工具）：<https://github.com/siemens/kas> · 文档 <https://kas.readthedocs.io>
- **tegra-demo-distro**（submodule 方案，本项目前身基线）：<https://github.com/OE4T/tegra-demo-distro>
- **meta-tegra**（Jetson BSP 层）：<https://github.com/OE4T/meta-tegra>
- **meta-tegra-community**：<https://github.com/OE4T/meta-tegra-community>
- **OpenEmbedded Core / bitbake**：<https://github.com/openembedded/openembedded-core>
- **meta-openembedded**（meta-oe 等）：<https://github.com/openembedded/meta-openembedded>
- **meta-virtualization**：<https://git.yoctoproject.org/meta-virtualization>

> 备忘：接 OpenWrt 系内容前，先在 <https://layers.openembedded.org> 检索，再进 `kas.yml`。
', '', 1, '2026-09-07', '2026-10-08T22:38:26.728Z', 'Why I Migrated Our Tegra/Jetson Yocto Distro from git submodules to KAS', 'Using the real embedai repo: why a Yocto project with many upstream layers is better served by declarative KAS than tegra-demo-distro-style submodules — one kas.yml pins versions, config is documentation, and daily work is three commands.', 'Embedded distributions drown in layers: in OpenEmbedded every feature is a separate repo, and assembling a buildable tree means aligning a pile of versions by hand. This post reviews, using the real repo [embedai](https://github.com/zishuowang696/embedai), why I migrated its Tegra/Jetson distribution from **git submodules** to [KAS](https://github.com/siemens/kas).

> Context: `embedai` is a custom Yocto distribution for **Jetson Orin Nano** (`jetson-orin-nano-devkit-nvme`) — `distro: embedai`, image `embedai-image` — built on top of OE4T''s `meta-tegra` and the official `tegra-demo-distro` baseline.

## 1. The starting point: tegra-demo-distro''s submodule approach

The OE4T-maintained **tegra-demo-distro** manages upstream layers with git submodules: `bitbake`, `openembedded-core`, `meta-openembedded`, `meta-tegra`, `meta-tegra-community`… one submodule per layer. Turning "how do I stitch these git repos into one build tree" into scattered `.gitmodules` entries plus a pile of shell scripts.

The pain grows linearly with the number of repositories:

- Every submodule needs its own `init` / `update`; versions drift on individual pointers, and nobody guarantees "this exact set" is compatible.
- Adding a layer means editing a submodule *and* hand-editing `bblayers.conf` — two error-prone steps.
- Moving machines or entering CI means replaying the whole manual flow.
- "Why this commit?" — the answer lives in history, not in configuration.

## 2. Migration: one kas.yml replaces all the manual work

KAS is "config-as-build": one `kas.yml` declares **which repos to fetch, which commit to pin, which layers to enable and their priority**, plus `machine` / `distro` / `target`. The tool turns the declared state into a buildable tree. After the migration, the entire "multi-repo + layers + build targets" story lives at the top of `kas.yml`:

```yaml
header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:         { prio: 85 }
      meta-python:     { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai
```

> `header.version` matches the KAS config version of your installed tool; the `22` above is just an example. Always follow the [KAS docs](https://kas.readthedocs.io) and the actual `kas.yml` in the repo.

### Comparison

| Dimension | tegra-demo-distro (git submodules) | This repo (KAS) |
|------|-----------------------------------|-----------------|
| Multi-repo management | one submodule per layer, manual `init/update`, hand-aligned versions | one `kas.yml` declares repos + layers; `kas checkout` does it all |
| Version consistency | depends on drifting submodule pointers | every repo pinned to a **commit** — a reproducible snapshot |
| Swap / add layers | edit submodules + `bblayers.conf`, error-prone | a few lines in `repos:` / `layers:` |
| Build entry point | memorize a chain of bitbake/env commands | `kas build` / `kas shell` / `kas dump`; config is documentation |
| Trim-ability | stack patches on top of the official distro | distro/image/layers live in your own `meta-embedai`, easy to cut |
| CI / automation | fragile scripts | kas commands drop straight into GitHub Actions |

## 3. Daily work is really just three commands

```
kas checkout   # pull all layers to their pinned commits
kas build      # build the target image (embedai-image)
kas shell      # open a bitbake shell for fine-grained work
```

Handy when debugging:

```
kas dump       # print the fully-resolved configuration (effective machine/distro/layers)
```

`kas build` internally handles the whole “init ritual” — generating `bblayers.conf` via `bitbake-layers` and injecting `machine`/`distro`. The payoff: **configuration is the documentation**. Anyone who clones the repo can reproduce a build without holding a sequence of steps in their head.

## 4. meta-embedai: keep your own changes in one place

All of `embedai`''s customizations live in the self-contained `meta-embedai` layer:

```text
meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # custom distro: embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A compatibility tweaks
└── recipes-core/               # image recipes (embedai-image), etc.
```

The benefit is a clean boundary: upstream layers stay pristine, and every override (distro definition, image contents, BSP patches) lives in your layer. Dropping something you don''t need only touches one place.

## 5. Reproducibility is the most valuable property of a distro

Every upstream repo is pinned to a full commit in `kas.yml`, so:

- different machines, fresh environments, and CI all produce the same result;
- when something breaks you can answer precisely “which commit introduced it”;
- upgrading an upstream is a one-line commit change, rebuilt and verified with visible risk.

## 6. Adding a layer? Search first, then declare

Want to integrate OpenWrt-related (or any OE) content later? The flow is fixed: search for a suitable layer at <https://layers.openembedded.org> → add the repo under `repos:` and declare path + priority under `layers:` in `kas.yml` → `kas checkout && kas build`. No more touching `bblayers.conf`.

## Links

- **embedai** (this repo: full `kas.yml` + `meta-embedai/`): <https://github.com/zishuowang696/embedai>
- **KAS** (config/build tool): <https://github.com/siemens/kas> · docs <https://kas.readthedocs.io>
- **tegra-demo-distro** (the submodule approach this project started from): <https://github.com/OE4T/tegra-demo-distro>
- **meta-tegra** (Jetson BSP layer): <https://github.com/OE4T/meta-tegra>
- **meta-tegra-community**: <https://github.com/OE4T/meta-tegra-community>
- **OpenEmbedded Core / bitbake**: <https://github.com/openembedded/openembedded-core>
- **meta-openembedded** (meta-oe etc.): <https://github.com/openembedded/meta-openembedded>
- **meta-virtualization**: <https://git.yoctoproject.org/meta-virtualization>

> Note: before pulling in OpenWrt-flavored layers, search <https://layers.openembedded.org> first, then declare them in `kas.yml`.
', '<p>Embedded distributions drown in layers: in OpenEmbedded every feature is a separate repo, and assembling a buildable tree means aligning a pile of versions by hand. This post reviews, using the real repo <a href="https://github.com/zishuowang696/embedai">embedai</a>, why I migrated its Tegra/Jetson distribution from <strong>git submodules</strong> to <a href="https://github.com/siemens/kas">KAS</a>.</p>
<blockquote><p>Context: <code>embedai</code> is a custom Yocto distribution for <strong>Jetson Orin Nano</strong> (<code>jetson-orin-nano-devkit-nvme</code>) — <code>distro: embedai</code>, image <code>embedai-image</code> — built on top of OE4T&#39;s <code>meta-tegra</code> and the official <code>tegra-demo-distro</code> baseline.</p></blockquote>
<h2>1. The starting point: tegra-demo-distro&#39;s submodule approach</h2>
<p>The OE4T-maintained <strong>tegra-demo-distro</strong> manages upstream layers with git submodules: <code>bitbake</code>, <code>openembedded-core</code>, <code>meta-openembedded</code>, <code>meta-tegra</code>, <code>meta-tegra-community</code>… one submodule per layer. Turning &quot;how do I stitch these git repos into one build tree&quot; into scattered <code>.gitmodules</code> entries plus a pile of shell scripts.</p>
<p>The pain grows linearly with the number of repositories:</p>
<ul><li>Every submodule needs its own <code>init</code> / <code>update</code>; versions drift on individual pointers, and nobody guarantees &quot;this exact set&quot; is compatible.</li><li>Adding a layer means editing a submodule <em>and</em> hand-editing <code>bblayers.conf</code> — two error-prone steps.</li><li>Moving machines or entering CI means replaying the whole manual flow.</li><li>&quot;Why this commit?&quot; — the answer lives in history, not in configuration.</li></ul>
<h2>2. Migration: one kas.yml replaces all the manual work</h2>
<p>KAS is &quot;config-as-build&quot;: one <code>kas.yml</code> declares <strong>which repos to fetch, which commit to pin, which layers to enable and their priority</strong>, plus <code>machine</code> / <code>distro</code> / <code>target</code>. The tool turns the declared state into a buildable tree. After the migration, the entire &quot;multi-repo + layers + build targets&quot; story lives at the top of <code>kas.yml</code>:</p>
<pre><code class="language-yaml">header:
  version: 22

distro: embedai
machine: jetson-orin-nano-devkit-nvme
target:
  - embedai-image

repos:
  openembedded-core:
    url: https://github.com/openembedded/openembedded-core.git
    commit: 20f678d825d1b8a1e8bfa88dedd51eb628c96d51
    path: oe-core
    layers:
      meta: { prio: 99 }
  meta-openembedded:
    url: https://github.com/openembedded/meta-openembedded.git
    commit: fe79e6e5c2cd009423e8f816ae91996cc86c3200
    path: meta-oe
    layers:
      meta-oe:         { prio: 85 }
      meta-python:     { prio: 80 }
      meta-networking: { prio: 75 }
      meta-filesystems: { prio: 70 }
  meta-tegra:
    url: https://github.com/OE4T/meta-tegra.git
    commit: c4462f4fe68cb64ba1d7fccb03095c7f975509b4
    path: meta-tegra
  # … bitbake / meta-tegra-community / meta-virtualization / tegra-demo-distro / meta-embedai</code></pre>
<blockquote><p><code>header.version</code> matches the KAS config version of your installed tool; the <code>22</code> above is just an example. Always follow the <a href="https://kas.readthedocs.io">KAS docs</a> and the actual <code>kas.yml</code> in the repo.</p></blockquote>
<h3>Comparison</h3>
<table><thead><tr><th>Dimension</th><th>tegra-demo-distro (git submodules)</th><th>This repo (KAS)</th></tr></thead><tbody><tr><td>Multi-repo management</td><td>one submodule per layer, manual <code>init/update</code>, hand-aligned versions</td><td>one <code>kas.yml</code> declares repos + layers; <code>kas checkout</code> does it all</td></tr><tr><td>Version consistency</td><td>depends on drifting submodule pointers</td><td>every repo pinned to a <strong>commit</strong> — a reproducible snapshot</td></tr><tr><td>Swap / add layers</td><td>edit submodules + <code>bblayers.conf</code>, error-prone</td><td>a few lines in <code>repos:</code> / <code>layers:</code></td></tr><tr><td>Build entry point</td><td>memorize a chain of bitbake/env commands</td><td><code>kas build</code> / <code>kas shell</code> / <code>kas dump</code>; config is documentation</td></tr><tr><td>Trim-ability</td><td>stack patches on top of the official distro</td><td>distro/image/layers live in your own <code>meta-embedai</code>, easy to cut</td></tr><tr><td>CI / automation</td><td>fragile scripts</td><td>kas commands drop straight into GitHub Actions</td></tr></tbody></table>
<h2>3. Daily work is really just three commands</h2>
<pre><code>kas checkout   # pull all layers to their pinned commits
kas build      # build the target image (embedai-image)
kas shell      # open a bitbake shell for fine-grained work</code></pre>
<p>Handy when debugging:</p>
<pre><code>kas dump       # print the fully-resolved configuration (effective machine/distro/layers)</code></pre>
<p><code>kas build</code> internally handles the whole “init ritual” — generating <code>bblayers.conf</code> via <code>bitbake-layers</code> and injecting <code>machine</code>/<code>distro</code>. The payoff: <strong>configuration is the documentation</strong>. Anyone who clones the repo can reproduce a build without holding a sequence of steps in their head.</p>
<h2>4. meta-embedai: keep your own changes in one place</h2>
<p>All of <code>embedai</code>&#39;s customizations live in the self-contained <code>meta-embedai</code> layer:</p>
<pre><code class="language-text">meta-embedai/
├── conf/
│   ├── layer.conf
│   ├── distro/embedai.conf     # custom distro: embedai
│   └── images/…
├── recipes-bsp/
│   └── arm-trusted-firmware/   # TF-A compatibility tweaks
└── recipes-core/               # image recipes (embedai-image), etc.</code></pre>
<p>The benefit is a clean boundary: upstream layers stay pristine, and every override (distro definition, image contents, BSP patches) lives in your layer. Dropping something you don&#39;t need only touches one place.</p>
<h2>5. Reproducibility is the most valuable property of a distro</h2>
<p>Every upstream repo is pinned to a full commit in <code>kas.yml</code>, so:</p>
<ul><li>different machines, fresh environments, and CI all produce the same result;</li><li>when something breaks you can answer precisely “which commit introduced it”;</li><li>upgrading an upstream is a one-line commit change, rebuilt and verified with visible risk.</li></ul>
<h2>6. Adding a layer? Search first, then declare</h2>
<p>Want to integrate OpenWrt-related (or any OE) content later? The flow is fixed: search for a suitable layer at &lt;https://layers.openembedded.org&gt; → add the repo under <code>repos:</code> and declare path + priority under <code>layers:</code> in <code>kas.yml</code> → <code>kas checkout &amp;&amp; kas build</code>. No more touching <code>bblayers.conf</code>.</p>
<h2>Links</h2>
<ul><li><strong>embedai</strong> (this repo: full <code>kas.yml</code> + <code>meta-embedai/</code>): &lt;https://github.com/zishuowang696/embedai&gt;</li><li><strong>KAS</strong> (config/build tool): &lt;https://github.com/siemens/kas&gt; · docs &lt;https://kas.readthedocs.io&gt;</li><li><strong>tegra-demo-distro</strong> (the submodule approach this project started from): &lt;https://github.com/OE4T/tegra-demo-distro&gt;</li><li><strong>meta-tegra</strong> (Jetson BSP layer): &lt;https://github.com/OE4T/meta-tegra&gt;</li><li><strong>meta-tegra-community</strong>: &lt;https://github.com/OE4T/meta-tegra-community&gt;</li><li><strong>OpenEmbedded Core / bitbake</strong>: &lt;https://github.com/openembedded/openembedded-core&gt;</li><li><strong>meta-openembedded</strong> (meta-oe etc.): &lt;https://github.com/openembedded/meta-openembedded&gt;</li><li><strong>meta-virtualization</strong>: &lt;https://git.yoctoproject.org/meta-virtualization&gt;</li></ul>
<blockquote><p>Note: before pulling in OpenWrt-flavored layers, search &lt;https://layers.openembedded.org&gt; first, then declare them in <code>kas.yml</code>.</p></blockquote>')
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, summary = excluded.summary, content_html = excluded.content_html,
    source_md = excluded.source_md, series = excluded.series, published = excluded.published,
    created_at = excluded.created_at, updated_at = excluded.updated_at,
    title_en = excluded.title_en, summary_en = excluded.summary_en,
    body_en = excluded.body_en, content_html_en = excluded.content_html_en;
INSERT INTO tags (name) VALUES ('yocto') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-tegra-kas-migration' AND t.name = 'yocto'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('tegra') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-tegra-kas-migration' AND t.name = 'tegra'
  ON CONFLICT DO NOTHING;
INSERT INTO tags (name) VALUES ('kas') ON CONFLICT(name) DO NOTHING;
INSERT INTO post_tags (post_id, tag_id)
  SELECT p.id, t.id FROM posts p, tags t WHERE p.slug = 'yocto-tegra-kas-migration' AND t.name = 'kas'
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
', '2026-09-01', '2026-10-08T22:38:26.729Z')
  ON CONFLICT(slug) DO UPDATE SET title = excluded.title, content_html = excluded.content_html, source_md = excluded.source_md, updated_at = excluded.updated_at;
