/** 通知页：全部 / 未读 Tab，点击跳转并标记已读 */
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AtSign,
  Bell,
  BellRing,
  CheckCheck,
  Heart,
  MessageCircle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { listNotifications, markAllRead, markRead } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { Avatar, Button, EmptyState, Tabs } from '@/components/ui/primitives';
import { cn, relativeTime } from '@/lib/utils';
import type { NotificationItem } from '@/lib/types';

function toBool(v: number | boolean | undefined): boolean {
  return v === 1 || v === true;
}

/** 系统通知 content 为后端 JSON.stringify({ title, body, link })；解析失败返回 null（回退渲染原文） */
function parseSystemContent(content: string | null): { title?: string; body?: string; link?: string } | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    return {
      title: typeof obj.title === 'string' ? obj.title : undefined,
      body: typeof obj.body === 'string' ? obj.body : undefined,
      link: typeof obj.link === 'string' ? obj.link : undefined,
    };
  } catch {
    return null;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshUnread } = useAuth();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    document.title = '通知 - Starlr Forum';
  }, []);

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => listNotifications(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.notifications) ?? [], [data]);
  const unread = items.filter((n) => !toBool(n.isRead)).length;

  const readMut = useMutation({
    mutationFn: (id: string) => markRead([id]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void refreshUnread();
    },
  });

  const readAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void refreshUnread();
    },
  });

  useEffect(() => {
    if (hasNextPage && items.length > 0 && items.length < 40) void fetchNextPage();
  }, [hasNextPage, items.length, fetchNextPage]);

  const visible = filter === 'unread' ? items.filter((n) => !toBool(n.isRead)) : items;

  const openNotification = (n: NotificationItem) => {
    if (!toBool(n.isRead)) readMut.mutate(n.id);
    // 系统通知：link 为站内相对路径时整条可点击跳转
    if (n.type === 'system') {
      const link = n.link ?? parseSystemContent(n.content)?.link;
      if (link && link.startsWith('/')) {
        navigate(link);
        return;
      }
    }
    if (n.postId) navigate(`/post/${n.postId}`);
  };

  return (
    <>
      <ColumnHeader
        title="通知"
        back
        right={
          unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => readAllMut.mutate()} className="gap-1.5 text-brand">
              <CheckCheck size={15} /> 全部已读
            </Button>
          ) : undefined
        }
        tabs={
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: '全部' },
              { value: 'unread', label: '未读', count: unread },
            ]}
          />
        }
      />

      {isLoading ? (
        <div className="pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex animate-pulse gap-3 border-b border-line px-4 py-4">
              <div className="h-10 w-10 rounded-full bg-surface2" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-surface2" />
                <div className="h-3 w-1/3 rounded bg-surface2" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<BellRing size={44} strokeWidth={1.2} />}
          title={filter === 'unread' ? '没有未读通知' : '还没有通知'}
          description="当有人回复、点赞或收藏你的帖子时，星光会在这里闪烁"
        />
      ) : (
        visible.map((n) => <NotificationRow key={n.id} n={n} onOpen={() => openNotification(n)} />)
      )}
    </>
  );
}

function NotificationRow({ n, onOpen }: { n: NotificationItem; onOpen: () => void }) {
  const isUnread = !toBool(n.isRead);
  const meta = typeMeta(n.type);
  const Icon = meta.Icon;
  const sys = n.type === 'system' ? parseSystemContent(n.content) : null;
  return (
    <button
      onClick={onOpen}
      className={cn(
        'flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left transition hover:bg-surface2',
        isUnread && 'bg-brand-soft/40',
      )}
    >
      <span className="relative shrink-0">
        <Avatar src={n.actorAvatar} name={n.actorName ?? '系统'} size={40} />
        <span className={cn('absolute -bottom-1 -right-1 rounded-full p-1 text-white', meta.bg)}>
          <Icon size={11} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[15px]">
          <span className="truncate font-bold">{n.actorName ?? 'Starlr'}</span>
          <span className="shrink-0 text-muted">{meta.label}</span>
          <span className="ml-auto shrink-0 text-[13px] text-faint">{relativeTime(n.createdAt)}</span>
        </span>
        {/* 系统通知：渲染解析出的 title/body；解析失败回退原文 */}
        {sys ? (
          <span className="mt-0.5 block">
            {sys.title && <span className="line-clamp-2 block text-sm font-semibold">{sys.title}</span>}
            {sys.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{sys.body}</span>}
          </span>
        ) : (
          n.content && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.content}</span>
        )}
        {n.postTitle && (
          <span className="mt-1 line-clamp-1 block text-sm font-semibold text-brand">「{n.postTitle}」</span>
        )}
      </span>
      {isUnread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />}
    </button>
  );
}

function typeMeta(type: string): { Icon: React.ComponentType<{ size?: number }>; label: string; bg: string } {
  switch (type) {
    case 'reply':
      return { Icon: MessageCircle, label: '回复了你', bg: 'bg-brand' };
    case 'mention':
      return { Icon: AtSign, label: '提到了你', bg: 'bg-brand' };
    case 'like':
    case 'like_reply':
      return { Icon: Heart, label: '赞了你', bg: 'bg-like' };
    case 'favorite':
      return { Icon: Star, label: '收藏了你', bg: 'bg-star' };
    case 'admin':
    case 'system':
      return { Icon: ShieldCheck, label: '系统通知', bg: 'bg-boost' };
    default:
      return { Icon: Bell, label: '通知了你', bg: 'bg-brand' };
  }
}
