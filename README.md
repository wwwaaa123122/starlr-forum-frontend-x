# Starlr Forum — Web 前端（frontend-x）

> X（Twitter）风格论坛前端 · React 19 + Vite 7 + TypeScript + Tailwind CSS v4
>
> 三栏时间线 / Feed 卡片流 / 发帖器 / 用户主页 / 移动端适配（底部导航 + 抽屉 + FAB）/ 完整管理后台
>
> 后端仓库：[`starlr-forum-backend`](https://github.com/wwwaaa123122/starlr-forum-backend)（Hono + Cloudflare Workers）
> 许可：GPL-3.0-or-later · 作者线上实例：<https://forum.182030.xyz>（仅作效果参考）

**本仓库是纯前端，单独无法运行**——它需要后端 API。两者一起部署即是一个完整论坛。

---

## 目录

- [前置条件与安装](#前置条件与安装)
- [本地开发](#本地开发)
- [构建与部署（两种模式）](#构建与部署两种模式)
- [环境变量](#环境变量)
- [配置项（站点名等）](#配置项站点名等)
- [故障排查](#故障排查)
- [管理后台功能](#管理后台功能)
- [目录结构](#目录结构)
- [设计来源与原创性](#设计来源与原创性)
- [许可](#许可)

---

## 前置条件与安装

| 需要 | 说明 |
|---|---|
| Node.js ≥ 20 | `node -v` 检查 |
| 后端仓库 | 建议与本仓库克隆到**同一父目录**（后端默认从 `../starlr-forum-frontend-x/dist` 读静态资源） |
| 包管理器 | **npm**（仓库自带 `package-lock.json`；不需要 pnpm，也不是 monorepo/workspace） |

```bash
git clone https://github.com/wwwaaa123122/starlr-forum-frontend-x.git
cd starlr-forum-frontend-x
npm ci          # 严格按 lockfile 安装（没有 lockfile 时用 npm install）
```

> 本仓库**不是** pnpm workspace，也没有 workspace 脚本。所有命令都在本仓库目录内用 `npm run ...` 执行。

## 本地开发

```bash
# 终端 1：后端（另一个仓库）
cd ../starlr-forum-backend
npm ci && cp .dev.vars.example .dev.vars && node scripts/generate-jwt-keys.mjs
npm run db:migrate:local
npm run dev                      # Worker @ http://127.0.0.1:8787

# 终端 2：前端
cd ../starlr-forum-frontend-x
npm run dev                      # http://127.0.0.1:5174
```

Vite 已配置代理：`/api`、`/oauth`、`/.well-known` → `http://127.0.0.1:8787`，所以本地**不需要**设置 `VITE_API_BASE`。

其他命令：

```bash
npm run typecheck   # tsc -b --noEmit（提交前必跑）
npm run build       # tsc -b && vite build → dist/（同域部署产物）
npm run preview     # 本地预览构建产物
```

## 构建与部署（两种模式）

### 模式 A：单 Worker 同域（推荐）

前端产物由后端 Worker 的 `assets` 直接托管，API 与页面同域。

```bash
npm ci && npm run build          # → dist/
cd ../starlr-forum-backend
npx wrangler deploy -c wrangler.prod.jsonc
```

- `VITE_API_BASE` **不要设置**（API 走相对路径 `/api`）
- 后端 `wrangler.prod.jsonc` 的 `assets.directory` 指向 `../starlr-forum-frontend-x/dist`
- 无 CORS 配置

### 模式 B：前后端分离（前端在 Pages 或另一域名）

```bash
VITE_API_BASE=https://api.example.com npm run build     # → dist/
```

然后把 `dist/` 部署到 Cloudflare Pages 或任意静态托管。**必须**在后端配置
`ALLOWED_ORIGINS=https://forum.example.com`，否则浏览器会被 CORS 拦截。

- API 请求、`/api/files/*` 图片、Markdown 图片链接、Turnstile 配置全部自动指向 `VITE_API_BASE`
- 后端 `SITE_URL` 填前端地址（邮件链接、OAuth 回跳用它）

> 可选：本仓库还提供 `npm run build:frontend`（输出 `dist-f/`），用于后端仓库的
> `wrangler.frontend.jsonc`（作者自己的纯前端域名部署），自部署可忽略。

## 环境变量

复制模板（`.env.example` → `.env.local`，已 gitignore）：

```bash
cp .env.example .env.local
```

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_API_BASE` | 空 | API 基址。**同域部署留空**；分离部署填 `https://api.example.com`（无尾斜杠） |

> 站点名、标语、注册开关等**不在这里配置**——它们由后端 `/api/config` 下发（管理后台「站点设置」改）。

## 配置项（站点名等）

前端所有品牌信息都从后端读取，**不需要改代码**：

| 显示位置 | 来源 |
|---|---|
| 浏览器标题（`xxx - 站点名`） | `/api/config` → `siteName` |
| 登录页页脚、侧栏页脚 | `siteName` / `siteFooter` |
| SEO `og:site_name`、描述 | `siteName` / `siteDescription` / `siteTagline` |
| 注册页是否显示邮箱输入框 | `/api/config` → `emailRequired` |
| 注册入口是否可用 | `/api/config` → `registrationEnabled` |
| 人机验证组件 | `/api/config` → `turnstileSiteKey` |

在管理后台 → **站点设置** 里改，保存后刷新页面即生效。

## 故障排查

| 现象 | 原因与处理 |
|---|---|
| 页面能开但所有接口 404 / 报错 | 后端没起（本地）或 `assets.directory` 指向错误（生产）。先确认 `http://127.0.0.1:8787/api/config` 有响应 |
| 接口 CORS 报错（分离部署） | 后端 `ALLOWED_ORIGINS` 未包含本前端 origin（要精确匹配，含 `https://`，不带尾斜杠） |
| 图片不显示 | 分离部署时 `VITE_API_BASE` 没设置 → 图片相对路径指到了前端域名。重新带变量构建 |
| 登录后立刻掉线 | 后端 `JWT_ISSUER` 与访问域名不一致；或后端换过 `JWT_SIGNING_KEYS`（旧 Token 全部失效，重新登录即可） |
| 注册页没有邮箱框 | 后端站点设置里关了「注册需要邮箱」（正常行为，用用户名+密码注册） |
| 人机验证组件不出现 | 后端 `TURNSTILE_SITE_KEY` 为空（未启用），或该域名未加入 Turnstile widget 允许域名 |
| `npm run dev` 端口被占 | 默认 5174，可 `npm run dev -- --port 5175`（记得同步后端 `ALLOWED_ORIGINS`） |
| `npm ci` 报 lockfile 不同步 | 用 `npm install` 更新 `package-lock.json` 后再 `npm ci` |

## 管理后台功能

入口：左侧栏 / 抽屉「管理后台」（版主及以上可见，路径 `/admin`）

- **概览**：用户/帖子/浏览量/待处理举报/封禁统计 + 浏览量 Top10（30s 自动刷新）
- **站点设置**：站点名/标语/描述/页脚；开放注册、注册需要邮箱、图片存储（R2/S3）
- **用户**（管理员）：搜索、角色调整（含版主板块管辖）、封禁/解封、禁言、激活邮箱
- **帖子**（版主+）：删除/恢复/置顶/加精、按状态筛选
- **板块**（管理员）：新建/编辑/删除（emoji 或图片图标）、恢复默认板块
- **举报**（版主+）：处理（关闭/禁言作者/封禁作者/删除内容）+ 必填备注
- **浏览统计**（版主+）：今日/昨日/7 天/30 天/累计、14 天趋势、热门、最近记录
- **通知**（管理员）：群发或按 UID 定向（限频 10 次/时）
- **版主**（管理员）：全站管辖或按板块任命
- **管理员**（管理员）：按 UID 授权/撤销（不可撤销自己）
- **服务配置**（管理员）：邮件(Resend)、S3、SEO、GitHub OAuth、Turnstile 说明
- **SSO 同步**（管理员）：允许登录状态同步的站点白名单
- **审计日志**（管理员）

## 目录结构

```
src/
├── main.tsx               # 入口：QueryClient + Router + AuthProvider + 主题
├── App.tsx                # 路由表 + 登录守卫
├── index.css              # Tailwind v4 @theme 设计令牌（明暗双主题）
├── lib/
│   ├── api.ts             # fetch 封装：Bearer 注入、401 单飞刷新重试、统一错误
│   ├── base-url.ts        # API_BASE（VITE_API_BASE）与 assetUrl()
│   ├── endpoints.ts       # 与后端 routes 一一对应的类型化端点
│   ├── useSiteConfig.ts   # 站点配置（/api/config）全局缓存 + 标题工具
│   ├── auth.tsx           # AuthProvider：会话恢复、到期前主动轮换
│   ├── markdown.tsx       # react-markdown + rehype-sanitize（不引入 rehype-raw）
│   └── types.ts           # API DTO
├── components/
│   ├── layout/            # AppShell / LeftSidebar / RightRail / MobileTabBar / MobileDrawer / ColumnHeader
│   ├── post/              # PostCard / Composer / ComposerModal / ReplyCard / RoleBadge
│   └── ui/primitives.tsx  # Button/Avatar/Modal/Dropdown/Tabs/EmptyState…
└── pages/
    ├── Home / Explore / Notifications / Bookmarks / Profile / PostDetail / Compose
    ├── Login / Register / VerifyEmail / ResetPassword / Legal / License / Categories / NotFound
    └── admin/             # 管理后台分区（AdminLayout + 各 Tab）
```

## 设计来源与原创性

设计参考了 5 个开源 X clone 项目（dattasai175/XClone、jokerhutt/x-clone、chinmayakain/twitter-ui-build、
Parshuram02/twitter-clone、weiwei2694/x-twitter-clone）的**布局模式与交互范式**，代码为原创实现：

| 维度 | X 的做法 | 本项目实现 |
| --- | --- | --- |
| 布局 | 左 275/88px + 中 600px + 右 350px，断点 640/1024/1280 | 相同骨架，改用语义化 token（`canvas/surface/line/ink/brand`） |
| 配色 | 品牌蓝 #1d9bf0 纯黑底 | 纯黑 #000 + 面板 #16181c + X 蓝 #1d9bf0 + 粉 #f91880 + 绿 #00ba7c，暗/亮双主题 |
| 内容 | 280 字纯文本推文 | 帖子 = **标题（120 字）+ Markdown 正文（5 万字）+ 标签（5 个）** |
| 互动 | 回复/转推/点赞/书签/浏览 | 回复/分享/点赞/收藏/浏览（映射论坛语义） |
| 徽章 | 认证蓝 V | 站长 / 管理员 / 版主角色徽章 |
| 头像下 | Follow/Following | UID + 帖子/回复计数（后端无关注体系） |

上述参考项目仅借鉴布局与交互思路，未复制其代码或素材。

## 关键交互

- **无限滚动**：`useInfiniteQuery` + IntersectionObserver（rootMargin 600px 预取）
- **乐观更新**：点赞/收藏先改本地态再发请求，失败回滚 + toast
- **@提及补全**：输入 `@` 前缀 400ms debounce 调 `/api/users/search`
- **浏览量**：进入详情 `POST /api/posts/:id/view`（服务端 KV 去重）
- **Token 会话**：401 单飞刷新（并发共享一个 Promise）+ 到期前主动轮换 + `TOKEN_REPLAY` 强制登出

## 许可

本项目基于 [GPL-3.0-or-later](./LICENSE) 开源。

- 可自由使用、学习、修改、分发；
- 二次开发作品必须同样以 GPL-3.0 开源并保留原始版权声明；
- 按「现状」提供，不附带任何担保；
- 版权所有 © 2026 wwwaaa123122。

第三方依赖均为 MIT / Apache-2.0 / ISC 等宽松许可（React、Vite、Tailwind、TanStack Query、react-router、lucide-react 等），与 GPL-3.0 兼容。
