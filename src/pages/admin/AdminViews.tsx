/** 浏览统计：总量卡 + 14 天趋势 + 近 7 天热门 + 最近浏览记录（60s 自动刷新） */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/primitives';
import { formatCount } from '@/lib/utils';
import { DEVICE_LABEL, TableWrap, Td, Th, type ViewStats } from './shared';

export default function AdminViews() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'views'],
    queryFn: () => api<ViewStats>('/api/admin/views'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-2xl" />;

  const t = data?.totals;
  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.views));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: '今日浏览', value: t?.today ?? 0 },
          { label: '昨日浏览', value: t?.yesterday ?? 0 },
          { label: '近 7 天', value: t?.week ?? 0 },
          { label: '近 30 天', value: t?.month ?? 0 },
          { label: '累计浏览（帖子）', value: t?.allTime ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-line bg-surface p-3">
            <div className="text-xs text-muted">{item.label}</div>
            <div className="mt-1 text-xl font-extrabold">{formatCount(item.value)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-[15px] font-extrabold">近 14 天趋势</h3>
        <div className="mt-3 flex h-32 items-end gap-1.5">
          {(data?.daily ?? []).map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}：${d.views} 次`}>
              <span className="text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">{d.views}</span>
              <div
                className="w-full rounded-t-sm bg-brand/70 transition-colors group-hover:bg-brand"
                style={{ height: `${Math.max(2, (d.views / maxDaily) * 100)}%` }}
              />
              <span className="text-[9px] text-muted">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-[15px] font-extrabold">近 7 天热门帖子</h3>
        {(data?.top ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">暂无数据</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(data?.top ?? []).map((row, i) => (
              <li key={row.postId} className="flex items-center gap-2 text-[13px]">
                <span className="w-5 text-xs text-muted">{i + 1}</span>
                <Link to={`/post/${row.postId}`} className="line-clamp-1 hover:underline">
                  {row.title}
                </Link>
                <span className="ml-auto shrink-0 text-xs text-muted">{formatCount(row.views)} 次</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 px-1 text-[15px] font-extrabold">最近浏览记录（最近 50 条）</h3>
        <TableWrap minWidth={760}>
          <thead>
            <tr>
              <Th>时间</Th>
              <Th>帖子</Th>
              <Th>访客</Th>
              <Th>位置</Th>
              <Th>节点</Th>
              <Th>设备</Th>
            </tr>
          </thead>
          <tbody>
            {(data?.recent ?? []).length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-center text-xs text-muted">
                  暂无浏览记录
                </Td>
              </tr>
            ) : (
              (data?.recent ?? []).map((v) => (
                <tr key={v.id} className="transition hover:bg-surface2/60">
                  <Td className="whitespace-nowrap text-xs text-muted">{v.createdAt}</Td>
                  <Td className="max-w-56 truncate text-xs">
                    <Link to={`/post/${v.postId}`} className="hover:underline">
                      {v.title}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{v.userName ? `@${v.userName}` : '游客'}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    {[v.city, v.country].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{v.colo || '—'}</Td>
                  <Td className="whitespace-nowrap text-xs">{DEVICE_LABEL[v.device] ?? v.device}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
      </div>
    </div>
  );
}
