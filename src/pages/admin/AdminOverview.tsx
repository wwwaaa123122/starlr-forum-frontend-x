/** 概览：站点统计卡 + 浏览量排行（30s 自动刷新） */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ban, Eye, FileText, Flag, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/primitives';
import { formatCount } from '@/lib/utils';
import { TableWrap, Td, Th, type AdminStats } from './shared';

export default function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api<AdminStats>('/api/admin/stats'),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const items = [
    { label: '用户', value: data?.users ?? 0, icon: Users },
    { label: '帖子', value: data?.posts ?? 0, icon: FileText },
    { label: '总浏览量', value: data?.totalViews ?? 0, icon: Eye },
    { label: '篇均浏览', value: data?.avgViews ?? 0, icon: TrendingUp },
    { label: '待处理举报', value: data?.pendingReports ?? 0, icon: Flag },
    { label: '封禁用户', value: data?.bannedUsers ?? 0, icon: Ban },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-5">
            <div className="rounded-xl bg-brand-soft p-2 text-brand">
              <Icon className="size-4" />
            </div>
            <div>
              <div className="text-xl font-extrabold">{formatCount(value)}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 浏览量排行 */}
      <div>
        <h3 className="mb-2 px-1 text-[15px] font-extrabold">
          浏览量排行 <span className="ml-1 text-xs font-normal text-faint">Top 10</span>
        </h3>
        <TableWrap minWidth={520}>
          <thead>
            <tr>
              <Th className="w-10">#</Th>
              <Th>标题</Th>
              <Th className="text-right">浏览</Th>
              <Th className="text-right">回复</Th>
              <Th className="text-right">点赞</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.topPosts ?? []).length === 0 ? (
              <tr>
                <Td colSpan={5} className="text-center text-xs text-muted">
                  暂无数据
                </Td>
              </tr>
            ) : (
              (data?.topPosts ?? []).map((p, i) => (
                <tr key={p.id} className="transition hover:bg-surface2/60">
                  <Td className="text-xs text-muted">{i + 1}</Td>
                  <Td className="max-w-64 truncate text-xs font-medium">
                    <Link to={`/post/${p.id}`} className="hover:underline">
                      {p.title}
                    </Link>
                    <span className="ml-1 text-muted">· {p.authorName}</span>
                  </Td>
                  <Td className="text-right text-xs">{formatCount(p.viewCount)}</Td>
                  <Td className="text-right text-xs">{formatCount(p.replyCount)}</Td>
                  <Td className="text-right text-xs">{formatCount(p.likeCount)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </div>
    </div>
  );
}
