# Starlr X — frontend-x

> Starlr 论坛的 X（Twitter）风格原创前端 · React 19 + Vite + Tailwind CSS v4
>
> 三栏时间线布局 / Feed 卡片流 / 发帖器 / 用户主页 / 移动端适配（底部导航 + 抽屉 + FAB）
>
> 后端：[`../backend`](../backend)（Hono + Cloudflare Workers，本仓库内）；经典版前端：[`../frontend`](../frontend)

## 快速开始

```bash
# 在仓库根目录
pnpm install --filter frontend-x
pnpm --filter frontend-x dev      # http://localhost:5174（/api 代理到本地 Worker :8787）

# 后端（同仓库内）
pnpm --filter backend dev         # http://localhost:8787
```

生产构建：`pnpm --filter frontend-x build`（输出 `dist/`，可由 Worker 的 assets 直接承载）。

## 设计来源与原创性

设计参考了 5 个开源 X clone 项目（dattasai175/XClone、jokerhutt/x-clone、chinmayakain/twitter-ui-build、Parshuram02/twitter-clone、weiwei2694/x-twitter-clone）的**布局模式与交互范式**，并做了以下原创化：

| 维度 | X 的做法 | Starlr 的实现 |
| --- | --- | --- |
| 布局 | 左 275/88px + 中 600px + 右 350px，断点 640/1024/1280 | 相同骨架，改用语义化 token（`canvas/surface/line/ink/brand`） |
| 配色 | 品牌蓝 #1d9bf0 纯黑底 | 星图紫 #7c6cff + 星金 #ffc857 + 深空底 #070912，暗/亮双主题 |
| 内容 | 280 字纯文本推文 | 帖子 = **标题（120 字）+ Markdown 正文（5 万字）+ 标签（5 个）** |
| 互动 | 回复/转推/点赞/书签/浏览 | 回复/分享/点赞/收藏/浏览（映射论坛语义） |
| 徽章 | 认证蓝 V | 站长（星标）/ 版主（星芒）角色徽章 |
| 头像下 | Follow/Following | UID + 帖子/回复计数（后端无关注体系） |

五个参考仓库共同缺失、但 Starlr 补齐的细节：**1.2K 数字格式化**、**标题字数计数**、**标签（hashtag）路由**、**亮/暗主题切换**、**XSS 转义验证**（帖子正文 markdown 白名单渲染）。

## 目录结构

```
frontend-x/src/
├── main.tsx               # 入口：QueryClient + Router + AuthProvider + 主题
├── App.tsx                # 路由表 + 登录守卫
├── index.css              # Tailwind v4 @theme inline 设计系统（星图双主题）
├── lib/
│   ├── api.ts             # fetch 封装：Bearer 注入、401 单飞刷新重试、统一错误
│   ├── endpoints.ts       # 与 backend/src/routes 一一对应的类型化端点
│   ├── auth.tsx           # AuthProvider：会话恢复、到期前主动轮换、未读数轮询
│   ├── markdown.tsx       # react-markdown + rehype-sanitize 白名单（不引入 rehype-raw）
│   ├── types.ts           # API DTO
│   └── utils.ts           # cn / formatCount(1.2K) / relativeTime / stripMarkdown
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # 三栏壳：<768 单栏 + 底栏；768–1280 图标栏；≥1280 全宽
│   │   ├── LeftSidebar.tsx     # 导航 + 发帖按钮 + 主题切换 + 账号芯片（下拉菜单）
│   │   ├── RightRail.tsx       # 搜索框 / 正在闪耀（热门标签）/ 星域导航 / 页脚
│   │   ├── MobileTabBar.tsx    # 底部 5 tab + 悬浮发帖 FAB（<768）
│   │   ├── MobileDrawer.tsx    # 侧滑抽屉（账号区 + 导航 + 主题 + 登出）
│   │   └── ColumnHeader.tsx    # 中栏吸顶标题（返回/标题/副标题/tabs 槽位）
│   ├── post/
│   │   ├── PostCard.tsx        # Feed 卡片 + ActionButton（四色光晕 hover）
│   │   ├── Composer.tsx        # 发帖/回复器：标题、正文自增、分类、标签、图片上传、@提及补全
│   │   ├── ComposerModal.tsx   # 桌面模态发帖
│   │   ├── ReplyCard.tsx       # 回复卡（楼中楼缩进、编辑/删除）
│   │   └── PostSkeleton.tsx
│   └── ui/primitives.tsx       # 无依赖组件：Button/Avatar/Modal/Dropdown/Tabs/EmptyState…
└── pages/                  # Home/Explore/Notifications/Bookmarks/Profile/PostDetail/Compose/Login/Register/Settings/Categories/NotFound
```

## 关键交互

- **无限滚动**：`useInfiniteQuery` + IntersectionObserver（rootMargin 600px 预取）
- **乐观更新**：点赞/收藏先改本地态再发请求，失败回滚 + toast
- **@提及补全**：输入 `@` 前缀 400ms debounce 调 `/api/users/search`，浮层插入
- **浏览量**：进入详情 `POST /api/posts/:id/view`（服务端 KV 去重），回写缓存
- **Token 会话**：401 单飞刷新（并发共享一个 Promise）+ 到期前 10 分钟主动轮换 + TOKEN_REPLAY 强制登出
- **可访问性**：操作钮 aria-label/title、modal Esc 关闭、focus-visible 光环

## 后端 pageSize 约束

`/api/*` 的 `paginationSchema` 上限为 **pageSize=50**，前端所有列表请求已按此约束（回复列表 50/页）。

## 尚未覆盖（与经典版前端互补）

- 管理后台（`/admin`）：请使用 `frontend` 经典版或后续迭代
- 图片上传后的预览网格（当前以 markdown 内联形式插入正文）
