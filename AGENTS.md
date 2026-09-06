# AGENTS.md

面向 AI 编程助手的项目指引。请先阅读本文件再修改代码或新增内容。

## 项目概述

个人学习/技术博客网站。技术栈为 **Bun + Hono + htmx + SQLite**（服务端渲染 + 局部刷新，无前端框架）。
内容主题：**OpenWrt / Yocto / NVIDIA Tegra（Jetson）嵌入式开发学习**，以及基于以上平台的 **AI 网关**（边缘 AI 网关）实践。

站点尽量轻量：SSR 输出 HTML，htmx 只负责局部片段交互（分页、评论、搜索等），不引入重型前端工具链。

## 技术栈

| 组件 | 选型 | 说明 |
| --- | --- | --- |
| 运行时 | Bun | 执行、打包、测试 |
| Web 框架 | Hono | 路由、中间件、SSR 输出 |
| 前端 | htmx | 通过 `<hx-*>` 请求 HTML 片段 |
| 数据库 | bun:sqlite | 单文件 SQLite，经统一模块访问 |
| 内容 | Markdown | frontmatter + 正文，build/读取时渲染 |

## 常用命令

```bash
bun install            # 安装依赖
bun run dev            # 本地开发（--hot 热重载）
bun run build          # 类型检查 + 预编译（如适用）
bun run build:bin      # bun build --compile 打包单文件可执行（进 dist/）
bun run start          # 生产运行
bun run typecheck      # bunx tsc --noEmit
bun run lint           # bunx eslint（如有配置）
bun test               # 运行测试（bun:test）
bun run db:init        # 建表 + 迁移（只动结构，不导入内容）
bun run db:import      # 从 content/archive/*.md 灌入/覆盖文章与静态页（upsert）
bun run db:promote <用户名>  # 将某用户提升为管理员（写入 users.role）
bun run db:seed-d1   # 从 content/archive 生成 D1 首灌种子 SQL（db/seed-d1.sql）
bun run schema:gen     # 结构变更后：db/schema.sql → src/lib/schema.ts（重新内嵌）
```

> 环境变量（见 `.env.example`）：`PORT`/`HOST`/`SITE_URL`（https 时 Cookie 加 Secure，sitemap 域名）、`ADMIN_USERNAMES`（逗号分隔，命中即授予 admin 角色）、`BLOG_DB_FILE`（测试指临时库）、`BLOG_ROOT`（单文件二进制部署时指向含 public/ 与 db/ 的工作目录）。Bun 启动时自动加载 `.env`。

> GitHub Actions：`.github/workflows/build-release.yml`（`bun run build:bin` 生成 Linux/macOS 二进制，打 tag `v*` 时附加到 GitHub Release）；`.github/workflows/cloudflare.yml`（默认关闭，需仓库变量 `CF_DEPLOY=true` + Secrets `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`；会先 `wrangler d1 migrations apply` 再 deploy，勾选 run_seed 时执行 `db/seed-d1.sql` 首灌）。`wrangler.toml` 需把 `database_id` 换成真实 D1 id。

> 脚本以 package.json 实际 script 为准；若有新增脚本/约定，请同步更新本文件。

## 目录结构（目标约定）

```
blog/
├── package.json / tsconfig.json / bunfig.toml / .gitignore / wrangler.toml
├── .github/workflows/    # build-release.yml（二进制）/ cloudflare.yml（Workers，需先 D1 适配）
├── AGENTS.md / .env.example
├── src/
│   ├── index.ts            # Bun 入口：initLocalDb + 静态资源挂载 + 监听端口
│   ├── app.tsx             # 装配 Hono app（不含静态/引擎，Worker 与本地共用）
│   ├── routes/             # home / posts / tags / pages / search / sitemap / auth / comments / admin（.tsx，async 取数后渲染视图）
│   ├── views/              # 页面视图组件（.tsx）：home / post / tags / search / page / auth / admin
│   ├── templates/          # layout.tsx（Layout/renderHtml async + 头部账号区）/ components.tsx（htmx 片段原子组件）/ util.ts（fmtDate/tagHref 等）
│   ├── lib/
│   │   ├── db.ts           # 全部查询与 CRUD（async，唯一 DB 入口）
│   │   ├── engine.ts       # 存储引擎接口 + useEngine()
│   │   ├── engine/sqlite.ts # 本地 bun:sqlite 引擎（initLocalDb）
│   │   ├── engine/d1.ts    # Cloudflare D1 引擎（initD1Db）
│   │   ├── content.ts      # PostInput/PageInput + md 序列化/解析（编辑器与导入共用）
│   │   ├── schema.ts       # 内嵌 SCHEMA_SQL（schema:gen 生成，勿手改）
│   │   ├── tables.ts       # Drizzle 表定义（与 db/schema.sql 保持一致，D1 迁移源）
│   │   ├── md.ts           # Markdown + frontmatter 解析渲染
│   │   ├── auth.ts         # PBKDF2 散列、Cookie 会话、角色工具
│   │   ├── env.ts          # envStr/setVars（跨 Bun/Worker 读环境变量）
│   │   └── slug.ts         # 标题转 slug 等工具
│   ├── middleware/         # http.ts：访问日志、安全头
│   ├── worker.ts          # CF Workers 入口（assets + D1 + vars 注入）
│   └── scripts/            # db-init.ts / db-import.ts / admin-promote.ts / gen-schema.ts / d1-seed.ts
├── content/
│   └── archive/            # 种子 md 存档（posts/ 与 pages/），仅作 db:import 源，日常不再读写
├── db/
│   ├── schema.sql          # 启动/init 时整体 exec（幂等，CREATE IF NOT EXISTS）
│   └── blog.sqlite         # 运行时生成，勿提交
├── migrations/             # 增量迁移（可选）
├── public/                 # css/style.css、vendor/htmx.min.js（本地化）、favicon.svg、robots.txt
└── tests/                  # md / slug / db 单测；db 测试用 BLOG_DB_FILE 指向临时库
```

> **内容以数据库为源**：文章/静态页的正文存 DB（含 `source_md` 原文，供后台编辑器往返）。`content/archive` 仅为一次性导入种子：`bun run db:import`（幂等 upsert）把历史 md 灌库后即可归档；运行时不读这些文件。后台 `/admin` 的新建/编辑/删除全部写 DB。

## 约定

### 通用
- TypeScript 全量使用，避免 `any`；类型收窄优先于断言。
- JSX 渲染层（`templates/`、`views/`、页面路由）为 `.tsx`，由 tsconfig `jsxImportSource: hono/jsx` 编译，零额外依赖。
- 代码不写注释，命名自解释；必要时才用极简注释说明“为什么”。
- 保持函数小而单一，复用 `lib/` 与 `views/` 下工具/组件。
- 不加额外依赖前先确认是否可用现有工具实现（避免引入重型库）。

### DB / SQLite（双引擎）
- **只允许**通过 `src/lib/db.ts` 访问数据库，禁止散落直接 `new Database()` 或 `env.DB`。
- `lib/db.ts` 全部 **async**，只写参数化 SQL（`?` 占位符）；运行存储抽成 **引擎接口**（`lib/engine.ts` + `useEngine()`）：本地 `lib/engine/sqlite.ts`（bun:sqlite，脚本/测试用 `initLocalDb()`）与 Cloudflare `lib/engine/d1.ts`（Worker，`initD1Db(env.DB)`）。db.ts 不得依赖 bun 专属 API（Worker 才能打包）。
- 表结构映射在 `src/lib/tables.ts`（Drizzle schema，D1 迁移源）；D1 迁移用 `bun run drizzle:generate` 产出到 `migrations/drizzle/`，由 `wrangler d1 migrations apply` 应用；本地仍由 `db/schema.sql → SCHEMA_SQL` 建表，改表两边同步（schema:gen 内嵌 + drizzle:generate 出迁移）。
- Cloudflare 部署：`src/worker.ts` 入口（assets 托管 public、`[[d1_databases]]`、`[vars]` 的 ADMIN_USERNAMES/SITE_URL 经 `lib/env.ts` 读取）；种子首灌：`bun run db:seed-d1` 生成 `db/seed-d1.sql`，再用 `wrangler d1 execute DB --remote --file` 灌入（幂等）。
- 认证已跨端可移植：密码 **WebCrypto PBKDF2**（`pbkdf2$...`）、会话 token 用 `crypto.getRandomValues`；旧 argon2 哈希不兼容，需重设密码（本地已重设 tester）。
- 库文件路径默认 `db/blog.sqlite`，测试通过环境变量 `BLOG_DB_FILE` 指到临时文件（在 import db/initLocalDb 前设置）。
- 结构变更：先改 `db/schema.sql` 并运行 `bun run schema:gen`（`src/lib/schema.ts` 内嵌同一 SQL，单文件二进制也要能建表）；CREATE 均带 IF NOT EXISTS；有存量数据时新增 `migrations/` 文件并记录已执行版本；新增列这类简单变更可在 `openDb()` 里用 `ensureColumn()`（PRAGMA table_info 判断后 ALTER）。
- 常用表（以实际 schema 为准）：`posts`(slug, title, summary, content_html, source_md, series, published, created_at, updated_at)、`tags`、`post_tags`、`pages`(slug, title, content_html, source_md, …)、`users`(username, email, display_name, password_hash, role, …)、`sessions`(token, user_id, expires_at)、`comments`(post_slug, user_id, body)。时间统一存 ISO 字符串。
- 内容以 **DB 为源**：`savePost()`/`savePage()` 负责写入并渲染 `content_html`、重建 tag 关联；`source_md` 存规范化 Markdown 供后台编辑器往返。无文件写入、无开机文件同步。
- 删除文章 `deletePost()` 会连带清理其 `post_tags` 与评论；slug 一经创建不改。

### 用户 / 权限 / 后台
- **只允许**通过 `src/lib/auth.ts` 处理认证：密码用 WebCrypto PBKDF2（跨 bun/Workers 可移植）散列，会话为 DB 内 token + `sid` Cookie（HttpOnly、SameSite=Lax、https 下 Secure）。
- 角色存 `users.role`（`user`/`admin`）。注册即普通用户；管理员来源：`.env` 的 `ADMIN_USERNAMES` 命中（登录/注册时授予），或 `bun run db:promote <用户名>`。**登录只升级不降级**，避免覆盖手工 promote。
- 页面渲染统一走 `renderHtml(c, opts)`（在 layout.tsx 内根据会话注入登录态导航），不要手动拼头部账号区。
- `/admin` 仅管理员可访问（`adminRoutes` 内 `adminOnly` 拦截，未登录跳登录、非管理员 403）。
- 前台只展示 `published=1` 的文章。后台全部读写 DB：文章管理/写新文章（`/admin`、`/admin/new`）、按 slug 编辑/删除（slug 不可改）、**导入 Markdown**（`/admin/import`，多文件上传、slug 取自文件名、存在即覆盖）、静态页管理（`/admin/pages`，含 `/about`）。写前统一校验 slug（`SLUG_RE`）与 frontmatter 字段。

### Hono 路由
- 路由全部收敛到 `src/routes/`，`app.ts` 只负责挂载、静态资源与中间件。
- 规范路径约定：
  - `/` 首页（文章列表）
  - `/posts/:slug` 文章详情
  - `/tags`、`/tags/:tag`、`/search?q=`、`/about`、`/sitemap.xml`
  - `/login`、`/register`、`/logout`（本地账号）、`/admin`（管理员控制台）
- 页面渲染用 **TSX**：视图在 `src/views/*.tsx` 组数据无关的纯组件，`routes/*.tsx` 取数后组合渲染；整页通过 `renderHtml(c, { title, active, body })`（`templates/layout.tsx`，负责 `<!doctype html>`、head、登录态头部账号区）。**JSX 表达式自动转义**，不要再手动拼 HTML 字符串或保留 `escHtml`。
- 注意点：组件函数**不要显式标注返回类型**（hono/jsx 的 FC 类型约束与 JSX 表达式类型不兼容，省略即可）；htmx 连字符属性（`hx-get` 等）经类型化对象 `{...{'hx-get': url}}` 展开；Markdown 产出或后端已转义的安全 HTML 用 `dangerouslySetInnerHTML`（白名单：文章正文、静态页、后台预览）。
- 详情页展示时间、标签、系列徽标、上一篇/下一篇导航与评论框；首页与 `/tags/:tag` 每页 `POSTS_PER_PAGE` 篇。

### htmx 交互
- 服务器返回**片段 HTML**，用请求头 `HX-Request === 'true'` 判断返回完整页还是局部片段。
- 首页/标签的“加载更多”：`<a class="btn" hx-get="/?page=N" hx-target="#post-list" hx-swap="outerHTML">`，片段与整页共用 `PostList`（`templates/components.tsx`）生成带 `id="post-list"` 的容器；anchor 保留 `href` 作为无 JS 降级。片段响应形如 `c.html(String(<PostList ... />))`。
- 搜索页：输入框 `hx-get="/search"`、`hx-target="#search-results"`、`hx-swap="outerHTML"`，触发 `input changed delay:350ms`；初始结果也由 SSR 生成同一容器。
- 评论（需登录）：`#comments-box` 整块外换——表单 `hx-post="/posts/:slug/comments"`、删除 `hx-post="/comments/:id/delete"`（仅作者/管理员，带 `hx-confirm`），均以 `hx-target="#comments-box"` + `outerHTML` 刷新；非 hx 请求回退为 303 跳回文章页。
- 写操作遵循 PRG：POST 后返回 303/`HX-Redirect` 或替换后的片段，避免重复提交。
- 客户端 JS 保持最小（仅 `public/vendor/htmx.min.js` 一个本地化文件），不引框架、不做全站 SPA 化。

### 内容写作约定（重要）
- 日常写作在后台 `/admin` 完成，正文直接存 DB。若用本地 md 导入（`/admin/import` 或 `db:import`），归档目录为 `content/archive/posts/<slug>.md`，frontmatter 至少包含：
  ```yaml
  ---
  title: ""
  date: 2026-01-01
  tags: [openwrt]
  summary: ""
  series: ""        # 可选，系列名（如 "AI 网关实战"）
  published: true
  ---
  ```
- slug 一律小写、连字符分隔，不出现空格与中文（如 `openwrt-buildroot-notes`）。
- 目录（TOC）、代码高亮、图片均依赖 md.ts 的渲染能力，写作时使用标准 Markdown。
- 代码示例写明上下文：OpenWrt 用 `menuconfig`/`uboot`/`.config`；Yocto 用 BitBake recipe（`.bb`/`.bbappend`）、layer 结构；Tegra/Jetson 给交叉编译与刷机（`jetson-flash`）步骤。
- 站点以中文为主，专有名词可保留英文（OpenWrt、Yocto、U-Boot、Jetson、AI 网关）。

### 主题相关背景速查
- **OpenWrt**：嵌入式 Linux 发行版，重点在固件编译（SDK/ImageBuilder）、`uci` 配置、`opkg` 包、驱动与无线、路由网关。
- **Yocto/BitBake**：构建自定义嵌入式 Linux 镜像，关注 `meta-` layer、recipe、`.config` 内核裁剪、交叉编译链。
- **Tegra / Jetson**：NVIDIA 嵌入式平台（如 Jetson Orin），涉及 BSP、JetPack、CUDA、容器化部署。
- **AI 网关**：上述硬件上做模型推理/转发/边云协同的边缘网关，文章可能包含 Docker/Podman、TensorRT、OpenWrt 上的转发（NAT/firewall/带宽）等内容。
- 写与 OpenWrt/Yocto/Tegra 相关的教程时，命令与配置必须**真实可复现**，代码块给出目标设备/软件版本假设。

## 测试
- 用 `bun:test`，与源码同构的 `tests/` 目录。
- 路由/DB 相关测试优先对 `lib/db` 的查询与 markdown/内容解析做单元测试；db 用例以 `savePost/savePage` 直接写临时库做种子；涉及 htmx 片段可做轻量集成测试。
- 新增功能应附带测试；运行 `bun test` 通过后再交付。

## 验收
- 修改后运行：`bun run typecheck`（必需）与 `bun test`；存在 lint 脚本时一并运行。
- 提交前自查：无 `console.log` 遗留、无敏感信息（密钥/内网地址）、无未使用导入。

## 说明
- 本项目仍处于搭建/演进期，本文件随结构变化更新；若你新增了脚本、目录或约定，请同步更新到这里。
