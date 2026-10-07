/** 类型化端点封装：与 backend/src/routes 一一对应 */
import { api } from './api';
import { API_BASE } from './base-url';
import type {
  Category,
  MeUser,
  NotificationListResponse,
  Pagination,
  PostDetail,
  PostSummary,
  Reply,
  SessionItem,
  TagItem,
  UserSearchItem,
  UserProfile,
} from './types';

/* ---------------- 公共 ---------------- */

export interface SiteConfig {
  siteName: string;
  turnstileSiteKey: string | null;
  registrationEnabled: boolean;
}

export const getConfig = () => api<SiteConfig>('/api/config');

/* ---------------- 认证 /api/auth ---------------- */

export interface AuthUserPayload {
  id: string;
  uid: number | null;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  role: string;
  postCount: number;
  replyCount: number;
  createdAt: string;
  emailVerified: boolean;
  accountStatus: 'active' | 'unverified' | 'banned';
}

export interface AuthResponse extends Record<string, unknown> {
  user: AuthUserPayload;
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
}

/** GitHub OAuth：一次性 code 兑换本站 token（重试关闭：code 一次性） */
export const exchangeOAuth = (code: string) =>
  api<AuthResponse>('/api/auth/oauth/exchange', { method: 'POST', body: { code }, retryOn401: false });

/** GitHub 授权入口（同源走相对路径；f 站自动指到 i.182030.xyz） */
export const githubOAuthStartUrl = () =>
  `${API_BASE}/oauth/start/github?redirect=${encodeURIComponent(window.location.origin)}`;

export const login = (identifier: string, password: string, turnstileToken?: string) =>
  api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password, ...(turnstileToken ? { turnstileToken } : {}) },
  });

export const register = (payload: {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  turnstileToken?: string;
}) => api<AuthResponse>('/api/auth/register', { method: 'POST', body: payload });

export const refreshTokens = (refreshToken: string) =>
  api<AuthResponse>('/api/auth/refresh', { method: 'POST', body: { refreshToken }, retryOn401: false });

export const logout = (refreshToken?: string) =>
  api<unknown>('/api/auth/logout', { method: 'POST', body: { refreshToken } });

export const logoutAll = () => api<unknown>('/api/auth/logout-all', { method: 'POST' });

export const fetchMe = () => api<{ user: MeUser }>('/api/auth/me');

/* ---------------- 分类 /api/categories ---------------- */

export const listCategories = () => api<{ categories: Category[] }>('/api/categories');

/* ---------------- 帖子 /api/posts ---------------- */

export interface PostListQuery {
  category?: string;
  tag?: string;
  sort?: 'latest' | 'new' | 'hot';
  author?: string;
  page?: number;
  pageSize?: number;
}

export const listPosts = (query: PostListQuery = {}) => {
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (query.tag) params.set('tag', query.tag);
  if (query.sort) params.set('sort', query.sort);
  if (query.author) params.set('author', query.author);
  params.set('page', String(query.page ?? 1));
  params.set('pageSize', String(query.pageSize ?? 20));
  return api<{ posts: PostSummary[]; pagination: Pagination }>(`/api/posts?${params}`);
};

export const hotTags = () => api<{ tags: TagItem[] }>('/api/posts/tags');

export const getPost = (id: string) => api<{ post: PostDetail }>(`/api/posts/${id}`);

export const createPost = (payload: { title: string; content: string; categoryId: string; tags?: string[] }) =>
  api<{ id: string }>('/api/posts', { method: 'POST', body: payload });

export const updatePost = (
  id: string,
  payload: { title?: string; content?: string; categoryId?: string; tags?: string[] },
) => api<unknown>(`/api/posts/${id}`, { method: 'PATCH', body: payload });

export const deletePost = (id: string) => api<unknown>(`/api/posts/${id}`, { method: 'DELETE' });

export const markView = (id: string) => api<{ viewCount?: number }>(`/api/posts/${id}/view`, { method: 'POST', retryOn401: false });

export const likePost = (id: string) => api<unknown>(`/api/posts/${id}/like`, { method: 'POST' });
export const unlikePost = (id: string) => api<unknown>(`/api/posts/${id}/like`, { method: 'DELETE' });
export const favoritePost = (id: string) => api<unknown>(`/api/posts/${id}/favorite`, { method: 'POST' });
export const unfavoritePost = (id: string) => api<unknown>(`/api/posts/${id}/favorite`, { method: 'DELETE' });

/** 注意：后端 paginationSchema 上限 pageSize=50 */
export const listReplies = (postId: string, page = 1, pageSize = 50) =>
  api<{ replies: Reply[]; pagination: Pagination }>(`/api/posts/${postId}/replies?page=${page}&pageSize=${pageSize}`);

export const createReply = (postId: string, payload: { content: string; parentReplyId?: string | null }) =>
  api<unknown>(`/api/posts/${postId}/replies`, { method: 'POST', body: payload });

export const updateReply = (id: string, content: string) =>
  api<unknown>(`/api/replies/${id}`, { method: 'PATCH', body: { content } });

export const deleteReply = (id: string) => api<unknown>(`/api/replies/${id}`, { method: 'DELETE' });

export const likeReply = (id: string) => api<unknown>(`/api/replies/${id}/like`, { method: 'POST' });
export const unlikeReply = (id: string) => api<unknown>(`/api/replies/${id}/like`, { method: 'DELETE' });

/* ---------------- 用户 /api/users ---------------- */

export const searchUsers = (q: string) =>
  api<{ users: UserSearchItem[] }>(`/api/users/search?q=${encodeURIComponent(q)}`);

export const getUser = (username: string) => api<{ user: UserProfile }>(`/api/users/${encodeURIComponent(username)}`);

export const getUserPosts = (username: string, page = 1, pageSize = 20) =>
  api<{ posts: PostSummary[]; pagination: Pagination }>(
    `/api/users/${encodeURIComponent(username)}/posts?page=${page}&pageSize=${pageSize}`,
  );

export const getUserReplies = (username: string, page = 1, pageSize = 20) =>
  api<{ replies: Reply[]; pagination: Pagination }>(
    `/api/users/${encodeURIComponent(username)}/replies?page=${page}&pageSize=${pageSize}`,
  );

/* ---------------- 搜索 /api/search ---------------- */

export interface SearchResponse {
  posts: PostSummary[];
  users: UserSearchItem[];
  total: number;
  postTotal?: number;
  userTotal?: number;
  pagination: Pagination;
  fallback?: boolean;
}

export const search = (params: {
  q: string;
  type?: 'post' | 'user';
  category?: string;
  tag?: string;
  sort?: 'latest' | 'new' | 'hot';
  page?: number;
  pageSize?: number;
}) => {
  const sp = new URLSearchParams({ q: params.q });
  if (params.type) sp.set('type', params.type);
  if (params.category) sp.set('category', params.category);
  if (params.tag) sp.set('tag', params.tag);
  if (params.sort) sp.set('sort', params.sort);
  sp.set('page', String(params.page ?? 1));
  sp.set('pageSize', String(params.pageSize ?? 20));
  return api<SearchResponse>(`/api/search?${sp}`);
};

/* ---------------- 通知 /api/notifications ---------------- */

export const listNotifications = (page = 1, pageSize = 20) =>
  api<NotificationListResponse>(`/api/notifications?page=${page}&pageSize=${pageSize}`);

export const unreadCount = () => api<{ unread: number }>('/api/notifications/unread-count');

export const markRead = (ids: string[]) => api<unknown>('/api/notifications/read', { method: 'POST', body: { ids } });

export const markAllRead = () => api<unknown>('/api/notifications/read-all', { method: 'POST' });

/* ---------------- 我 /api/me ---------------- */

export const meFavorites = (page = 1, pageSize = 20) =>
  api<{ posts: PostSummary[]; pagination: Pagination }>(`/api/me/favorites?page=${page}&pageSize=${pageSize}`);

export const meLikes = (page = 1, pageSize = 20) =>
  api<{ posts: PostSummary[]; pagination: Pagination }>(`/api/me/likes?page=${page}&pageSize=${pageSize}`);

export const updateMe = (payload: {
  nickname?: string;
  bio?: string;
  avatarUrl?: string | null;
  /** 喜欢（点赞列表）是否公开 */
  likesPublic?: boolean;
  /** 主页背景图；null = 移除 */
  backgroundUrl?: string | null;
}) =>
  api<{ user: MeUser }>('/api/me', { method: 'PATCH', body: payload });

export const changePassword = (payload: { currentPassword: string; newPassword: string }) =>
  api<unknown>('/api/me/password', { method: 'PATCH', body: payload });

export const mySessions = () => api<{ sessions: SessionItem[] }>('/api/me/sessions');

export const revokeSession = (id: string) => api<unknown>(`/api/me/sessions/${id}`, { method: 'DELETE' });

export const revokeOthers = () => api<unknown>('/api/me/sessions/revoke-others', { method: 'POST' });

/* ---------------- 上传 /api/upload ---------------- */

export async function uploadImage(
  file: File,
  purpose: 'post' | 'reply' | 'avatar' | 'category' | 'background',
): Promise<string> {
  // 上传前在浏览器压缩：背景图允许更长边（宽幅横图），头像默认即可
  const { compressImage } = await import('./image-compress');
  const { file: compressed } = await compressImage(file, purpose === 'background' ? { maxEdge: 2560 } : {});
  const form = new FormData();
  form.append('file', compressed);
  form.append('purpose', purpose);
  const res = await api<{ url: string; key?: string }>('/api/upload', { method: 'POST', body: form });
  return res.url;
}

/** 某用户的公开喜欢列表（本人不受限） */
export const userLikes = (username: string, page = 1, pageSize = 20) =>
  api<{ posts: PostSummary[]; pagination: Pagination }>(
    `/api/users/${encodeURIComponent(username)}/likes?page=${page}&pageSize=${pageSize}`,
  );

/* ---------------- 举报 /api/reports ---------------- */

/** reason 枚举须与后端一致：spam | abuse | porn | illegal | other */
export const createReport = (payload: {
  targetType: 'post' | 'reply' | 'user';
  targetId: string;
  reason: 'spam' | 'abuse' | 'porn' | 'illegal' | 'other';
  detail?: string;
}) =>
  api<unknown>('/api/reports', { method: 'POST', body: payload });
