/** 管理后台共用：类型 / 表格 / 分页 / 徽标 / 确认弹窗（与全站 X 风格一致） */
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
import { ApiClientError } from '@/lib/api';
import { Button, Modal } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/* ---------------- 类型（与后端 admin 接口一一对应） ---------------- */

export interface AdminPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface AdminUser {
  id: string;
  uid: number;
  username: string;
  email: string;
  nickname: string;
  role: string;
  status: string;
  postCount: number;
  replyCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  emailVerified?: number | boolean;
  mutedUntil?: string | null;
  mutedPermanent?: boolean;
}

export interface AdminPost {
  id: string;
  title: string;
  isDeleted: number;
  isPinned: number;
  isFeatured: number;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  authorName: string;
  categoryName: string;
}

export interface ReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  detail: string;
  status: string;
  resolutionNote: string;
  createdAt: string;
  handledAt: string | null;
  reporterName: string;
  targetTitle?: string | null;
  targetContent?: string | null;
  targetAuthorName?: string | null;
  targetUserId?: string | null;
  targetDeleted?: number | boolean;
}

export interface ModeratorRow {
  userId: string;
  categoryId: string;
  createdAt: string;
  uid: number;
  username: string;
  nickname: string;
  categoryName: string;
  categorySlug: string;
}

export interface SiteWideModerator {
  userId: string;
  uid: number;
  username: string;
  nickname: string;
  createdAt: string;
}

export interface AdminStaff {
  id: string;
  uid: number;
  username: string;
  email: string;
  nickname: string;
  role: 'admin' | 'moderator';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string;
  ip: string;
  createdAt: string;
  actorName: string | null;
}

export interface AdminStats {
  users: number;
  posts: number;
  replies: number;
  pendingReports: number;
  bannedUsers: number;
  totalViews: number;
  avgViews: number;
  topPosts: { id: string; title: string; viewCount: number; replyCount: number; likeCount: number; authorName: string }[];
}

export interface ViewStats {
  totals: { today: number; yesterday: number; week: number; month: number; allTime: number };
  daily: { date: string; views: number }[];
  top: { postId: string; title: string; views: number }[];
  recent: {
    id: string;
    postId: string;
    title: string;
    country: string;
    city: string;
    colo: string;
    device: string;
    userId: string | null;
    userName: string | null;
    createdAt: string;
  }[];
}

/** 全站管辖的特殊标记值（不与真实板块 id 冲突） */
export const SITE_WIDE = '__site_wide__';

export const REASON_LABEL: Record<string, string> = {
  spam: '垃圾广告',
  abuse: '辱骂',
  porn: '色情',
  illegal: '违法',
  other: '其他',
};

export const DEVICE_LABEL: Record<string, string> = { mobile: '手机', tablet: '平板', desktop: '电脑' };

export function adminErrMsg(e: unknown): string {
  return e instanceof ApiClientError ? e.message : '操作失败';
}

/** 让所有 admin 查询失效 */
export function useRefreshAdmin() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ['admin'] });
}

/* ---------------- 徽标（状态着色） ---------------- */

export type TagTone = 'brand' | 'ok' | 'warn' | 'danger' | 'plain';

const TONE_CLASS: Record<TagTone, string> = {
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-boost/10 text-boost',
  warn: 'bg-like/10 text-like',
  danger: 'bg-danger/10 text-danger',
  plain: 'bg-surface2 text-muted',
};

export function Tag({ tone = 'plain', className, children }: { tone?: TagTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-4',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- 表格容器（移动端横向滚动） ---------------- */

export function TableWrap({ minWidth, children }: { minWidth?: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full text-left text-[13px]" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <th className={cn('whitespace-nowrap border-b border-line px-3.5 py-2.5 text-xs font-bold text-muted', className)}>
      {children}
    </th>
  );
}

export function Td({ className, children, colSpan }: { className?: string; children?: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn('border-b border-line px-3.5 py-2.5 align-middle', className)}>
      {children}
    </td>
  );
}

/* ---------------- 分页 ---------------- */

export function PageNav({
  pagination,
  onPage,
}: {
  pagination?: AdminPagination;
  onPage: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) {
    if (!pagination || pagination.total === 0) return null;
    return <p className="px-1 text-xs text-faint">共 {pagination.total} 条</p>;
  }
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs text-faint">
        第 {pagination.page} / {pagination.totalPages} 页 · 共 {pagination.total} 条
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" pill disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
          <ChevronLeft size={15} /> 上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          pill
          disabled={!pagination.hasMore}
          onClick={() => onPage(pagination.page + 1)}
        >
          下一页 <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- 确认弹窗 ---------------- */

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '确认',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} className="w-[92vw] max-w-md p-6">
      <h3 className="text-lg font-extrabold">{title}</h3>
      {description && <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" pill onClick={onClose}>
          取消
        </Button>
        <Button pill variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- 表单字段 ---------------- */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

/** 轻提示封装：成功 toast + 刷新 admin 查询 */
export function useAdminAction() {
  const refresh = useRefreshAdmin();
  return async (fn: () => Promise<unknown>, successMsg = '操作成功') => {
    try {
      await fn();
      toast.success(successMsg);
      refresh();
      return true;
    } catch (e) {
      toast.error(adminErrMsg(e));
      return false;
    }
  };
}
