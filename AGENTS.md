# AGENTS.md — frontend-x（Starlr X 主力前端）

X/Twitter 风格原创前端（三栏时间线 + 完整管理后台）。**本项目的现行 Web 前端**，新功能都落在这里（`frontend/` 经典版已下线）。

## 技术栈

React 19 + Vite 7 + TypeScript + Tailwind v4（`--sl-*` 设计令牌）+ TanStack Query v5 + react-router + lucide-react + sonner + react-easy-crop。

## 命令

```bash
npm run dev          # Vite @ :5174（代理 :8787 后端）
npm run build        # tsc -b && vite build → dist/（x.182030.xyz，同源 API）
VITE_API_BASE=https://i.182030.xyz npm run build:frontend   # → dist-f/（f.182030.xyz 纯前端）
npm run typecheck    # tsc -b --noEmit（提交前必跑）
```

**部署**（产物构建好后到 `../backend/` 执行）：

| 目标 | 构建 | 部署 |
|---|---|---|
| x.182030.xyz / forum.182030.xyz（`xingchen-forum-x`） | `npm run build` | `npx wrangler deploy -c wrangler.x.jsonc` |
| f.182030.xyz（`forum-frontend`，跨域直连 i.182030.xyz） | `VITE_API_BASE=https://i.182030.xyz npm run build:frontend` | `npx wrangler deploy -c wrangler.frontend.jsonc` |

⚠️ 构建后**核对 dist 里 JS hash 变了**再部署；两个产物的 VITE_API_BASE 不同，别混用（x 用 `dist/`，f 用 `dist-f/`）。

## 目录速览

```
src/
  lib/
    api.ts          # api()：Bearer 注入 + 401 单飞刷新重试 + 统一错误
    base-url.ts     # API_BASE（VITE_API_BASE）与 assetUrl()：站内图片/链接拼前缀
    endpoints.ts    # 全部 API 调用封装（新接口加这里）
    auth.tsx        # AuthProvider：用户状态走本地 state（不是 react-query 缓存！）
    theme.ts        # useSyncExternalStore 主题store：useTheme/toggleTheme/setTheme
    markdown.tsx    # RichText：rehype-sanitize，仅 http/https/mailto/relative 链接
    image-compress.ts  # 上传压缩（GIF跳过/PNG保PNG/其余JPEG0.82）
    types.ts        # 与后端字段一一对应（可选字段向后兼容）
  components/
    ui/primitives.tsx   # Button/Modal/Input/Avatar/EmptyState…（Avatar 内部已做 assetUrl）
    layout/             # AppShell/ColumnHeader/LeftSidebar/MobileDrawer（含 drawerNavItems）
    post/               # PostCard/ReplyCard/Composer/ComposerModal
  pages/
    admin/              # 管理后台 10 个分区（AdminLayout 左侧 tab 导航）
    Settings.tsx Profile.tsx Home.tsx Explore.tsx PostDetail.tsx Login.tsx …
```

## 关键约定（踩过的坑）

**AuthProvider / 用户状态**
- 用户对象保存在 AuthProvider 的 `useState`，**不要**放进 react-query 缓存；设置页任何变更（PATCH /api/me）成功后要 `setUser(res.user)`，否则刷新后回退。
- 冷启动/刷新走 `/api/auth/me`（不是 `/api/me`）。后端两处序列化必须同步加字段（见 backend/AGENTS.md）。

**react-query**
- 同一 queryKey 的 queryFn 返回形状必须全项目一致：`['categories']` 统一用 `listCategories`（`{ categories: Category[] }`），消费侧 `.categories ?? []`——历史上混用形状导致管理页白屏。
- 管理端变更后 `qc.invalidateQueries({ queryKey: ['admin'] })` + 相关列表。

**Hooks 顺序**
- 任何 hook（含 `useTheme()`）必须放在早退 `if (!open) return null` **之前**——MobileDrawer 曾因此整树黑屏。

**图片与上传**
- 一切来自接口的图片地址渲染时过 `assetUrl()`（Avatar 已内置；Profile/Settings/板块图标已接）。上传一律走 `uploadImage(file, purpose)`，purpose：`post|reply|avatar|category|background`。
- 头像/背景上传要弹 `ImageCropDialog`（react-easy-crop）；GIF 跳过裁剪与压缩。

**文案/样式**
- 界面文案全部中文；表单 placeholder 不放示例（密码框可用「8 位以上」）。
- 颜色只用 `--sl-*` 令牌与 `text-muted`/`bg-surface2` 等语义类，不写死色值；明暗主题都要检查（`useTheme()` + `document.documentElement.dataset.theme`）。
- Logo 用 `icon-512.png` 圆角 25%。

**部署分离模式**
- 同源（x 站）`API_BASE=''`；f 站构建注入 `https://i.182030.xyz`。新代码里**禁止**裸 `fetch('/api/...')`，统一 `api()`；跨域新静态资源域名记得加进后端 `ALLOWED_ORIGINS` 与 Turnstile widget domains。

## 验证

- agent-browser：桌面 1280×800 / 移动 390×844；本地登录 `nebula/nebula12345`（:5174 + :8787）。
- 生产无头浏览器渲染不出 Turnstile 组件（自动化环境限制），登录流程本地验证即可。
- 视觉回归看工作区根目录的历史截图命名习惯（`frontend-x-*-*.png`）。

## Git

独立仓库 `github.com/wwwaaa123122/starlr-forum-frontend-x`（main，**中文提交信息**，一行主题）。改动 + 部署完成后提交并 `git push`。
