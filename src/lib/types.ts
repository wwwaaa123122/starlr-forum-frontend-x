/** Starlr API 类型（与后端 /api 路由一一对应） */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  postCount: number;
  /** 发布权限：everyone = 所有用户；staff = 仅版主及以上 */
  postPolicy: 'everyone' | 'staff';
}

export interface PostSummary {
  id: string;
  authorUid?: number | null;
  title: string;
  excerpt?: string;
  isPinned: number | boolean;
  isFeatured: number | boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string | null;
  lastReplyAt: string | null;
  authorId: string;
  authorName: string;
  authorNickname?: string | null;
  authorAvatar: string | null;
  authorRole?: string;
  categoryId?: string;
  categoryName: string;
  categorySlug: string;
  tags?: string[] | { name: string }[];
}

export interface PostDetail extends PostSummary {
  content: string;
  isDeleted: boolean;
  editedAt: string | null;
  liked: boolean;
  favorited: boolean;
  isAuthor: boolean;
  canModerate: boolean;
  authorUsername?: string;
  authorRole?: string;
}

export interface Reply {
  id: string;
  authorUid?: number | null;
  content: string;
  parentReplyId: string | null;
  replyToUserId: string | null;
  replyToUserName: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  liked?: number | boolean;
  authorId: string;
  authorName: string;
  authorNickname?: string | null;
  authorAvatar: string | null;
  authorRole?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  postId: string | null;
  replyId: string | null;
  content: string | null;
  isRead: number | boolean;
  createdAt: string;
  actorName: string | null;
  actorAvatar: string | null;
  postTitle: string | null;
}

export interface UserProfile {
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
  banned?: boolean;
  /** 喜欢（点赞列表）是否公开 */
  likesPublic?: boolean;
  /** 主页背景图 */
  backgroundUrl?: string | null;
}

export interface MeUser extends UserProfile {
  emailVerified: boolean;
  accountStatus: 'active' | 'unverified' | 'banned';
  email?: string;
  /** 是否已绑定 GitHub */
  hasGithub?: boolean;
}

export interface UserSearchItem {
  username: string;
  nickname: string;
  avatarUrl: string | null;
  role?: string;
}

export interface TagItem {
  name: string;
  count: number;
}

export interface SessionItem {
  id: string;
  /** 原始 User-Agent（前端解析为友好设备名） */
  device: string;
  ip: string;
  /** 城市等位置文本（Cloudflare IP 库），历史会话可能为空 */
  location: string;
  colo?: string;
  loginAt: string;
  lastUsedAt: string | null;
  current?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  pagination: Pagination;
  unread: number;
}

/** 通知类型的中文文案 */
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  reply: '回复了你',
  mention: '提到了你',
  like: '赞了你的帖子',
  like_reply: '赞了你的回复',
  favorite: '收藏了你的帖子',
  admin: '系统通知',
  system: '系统通知',
};
