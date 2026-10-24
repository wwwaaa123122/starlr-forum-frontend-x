/** 搜索引擎推送记录：百度/IndexNow 提交状态、响应码、重试次数；支持重试与全量校验 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { adminErrMsg } from './shared';
import { TableWrap, Td, Th } from './shared';
import { Button, EmptyState } from '@/components/ui/primitives';

interface PushLog {
  id: string;
  postId: string;
  url: string;
  title: string | null;
  channel: 'baidu' | 'indexnow';
  event: string;
  status: 'ok' | 'failed';
  httpCode: number | null;
  attempts: number;
  message: string | null;
  createdAt: string;
}

const EVENT_LABEL: Record<string, string> = {
  create: '发布',
  edit: '编辑',
  delete: '删除',
  retry: '重试',
  cron: '定时校验',
};

/** HTTP 状态码含义速查 */
const HTTP_HINT: Record<number, string> = {
  200: '已收录（URL 此前已提交过）',
  202: '已受理，等待抓取',
  400: '请求格式无效',
  403: 'key 无效或域名未验证',
  422: 'URL 与 key 的域名不匹配',
  429: '请求过于频繁被限流',
};

/** 状态徽章：失败（或有关注信息）时点击弹出完整详情 Popover */
function StatusBadge({ status, httpCode, message, attempts }: {
  status: 'ok' | 'failed';
  httpCode: number | null;
  message: string | null;
  attempts: number;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(message || httpCode);
  const badge = (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        status === 'ok' ? 'bg-boost/10 text-boost' : 'bg-danger/10 text-danger'
      } ${hasDetail ? 'cursor-pointer' : ''}`}
      onClick={hasDetail ? () => setOpen((v) => !v) : undefined}
    >
      {status === 'ok' ? '成功' : '失败'}
    </span>
  );
  if (!hasDetail) return badge;
  return (
    <span className="relative inline-block">
      {badge}
      {open && (
        <>
          {/* 点击外部关闭 */}
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-6 z-50 block w-64 rounded-xl border border-line bg-surface p-3 text-left shadow-lg">
            <span className="block text-[11px] font-bold text-ink">推送详情</span>
            {httpCode !== null && (
              <span className="mt-1 block text-[11px] text-muted">
                HTTP {httpCode}{HTTP_HINT[httpCode] ? `：${HTTP_HINT[httpCode]}` : ''}
              </span>
            )}
            {attempts > 1 && (
              <span className="block text-[11px] text-muted">尝试 {attempts} 次后失败</span>
            )}
            {message && (
              <span className="mt-1 block break-all text-[11px] leading-relaxed text-muted">{message}</span>
            )}
          </span>
        </>
      )}
    </span>
  );
}

export default function AdminSeoPushes() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState<'' | 'baidu' | 'indexnow'>('');
  const [status, setStatus] = useState<'' | 'ok' | 'failed'>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'seo-pushes', channel, status, page],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (channel) p.set('channel', channel);
      if (status) p.set('status', status);
      return api<{
        logs: PushLog[];
        pagination: { page: number; totalPages: number; total: number };
        stats: { channel: string; status: string; n: number }[];
      }>(`/api/admin/seo-pushes?${p}`);
    },
    refetchInterval: 30_000,
  });

  const retryMut = useMutation({
    mutationFn: (postId: string) => api(`/api/admin/seo-pushes/${postId}/retry`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('已重新推送');
      void qc.invalidateQueries({ queryKey: ['admin', 'seo-pushes'] });
    },
    onError: (e) => toast.error(adminErrMsg(e)),
  });

  const validateMut = useMutation({
    mutationFn: () => api<{ pushed: number }>('/api/admin/seo-pushes/validate-all', { method: 'POST' }),
    onSuccess: (res) => {
      toast.success(`全量校验完成：重推 ${res.pushed} 篇`);
      void qc.invalidateQueries({ queryKey: ['admin', 'seo-pushes'] });
    },
    onError: (e) => toast.error(adminErrMsg(e)),
  });

  const stat = (ch: string, st: string) =>
    data?.stats.find((s) => s.channel === ch && s.status === st)?.n ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['', 'baidu', 'indexnow'] as const).map((ch) => (
          <button
            key={ch || 'all'}
            onClick={() => { setChannel(ch); setPage(1); }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
              channel === ch ? 'bg-brand-soft font-bold text-brand' : 'text-muted hover:bg-surface2 hover:text-ink'
            }`}
          >
            {ch === '' ? '全部' : ch === 'baidu' ? '百度' : 'IndexNow'}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-line" />
        {(['', 'ok', 'failed'] as const).map((st) => (
          <button
            key={st || 'all'}
            onClick={() => { setStatus(st); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-[13px] transition ${
              status === st ? 'bg-brand-soft font-bold text-brand' : 'text-muted hover:bg-surface2 hover:text-ink'
            }`}
          >
            {st === '' ? '全部状态' : st === 'ok' ? '成功' : '失败'}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-xs text-muted">
          24h：百度 成功 {stat('baidu', 'ok')} / 失败 {stat('baidu', 'failed')} · IndexNow 成功 {stat('indexnow', 'ok')} / 失败 {stat('indexnow', 'failed')}
        </span>
        <Button
          pill size="sm"
          disabled={validateMut.isPending}
          onClick={() => validateMut.mutate()}
        >
          {validateMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <SearchCheck size={13} />} 全量校验
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      ) : (data?.logs.length ?? 0) === 0 ? (
        <EmptyState title="暂无推送记录" description="发帖或编辑后会自动推送并记录" />
      ) : (
        <>
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <Th>帖子</Th>
                <Th>渠道</Th>
                <Th>事件</Th>
                <Th>状态</Th>
                <Th className="text-right">HTTP</Th>
                <Th className="text-right">重试</Th>
                <Th>时间</Th>
                <Th className="text-right">操作</Th>
              </tr>
            </thead>
            <tbody>
              {data!.logs.map((l) => (
                <tr key={l.id} className="transition hover:bg-surface2/60">
                  <Td className="max-w-56 truncate text-xs font-medium">
                    {l.title ? (
                      <a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.title}</a>
                    ) : (
                      <span className="text-muted">{l.url}</span>
                    )}
                  </Td>
                  <Td className="text-xs">{l.channel === 'baidu' ? '百度' : 'IndexNow'}</Td>
                  <Td className="text-xs">{EVENT_LABEL[l.event] ?? l.event}</Td>
                  <Td>
                    <StatusBadge status={l.status} httpCode={l.httpCode} message={l.message} attempts={l.attempts} />
                  </Td>
                  <Td className="text-right text-xs">{l.httpCode ?? '—'}</Td>
                  <Td className="text-right text-xs">{l.attempts > 1 ? `${l.attempts} 次` : '—'}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{l.createdAt}</Td>
                  <Td className="text-right">
                    {l.status === 'failed' && (
                      <Button
                        size="sm" variant="ghost" pill
                        disabled={retryMut.isPending}
                        onClick={() => retryMut.mutate(l.postId)}
                      >
                        <RefreshCw size={12} /> 重试
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
          {data!.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button size="sm" variant="ghost" pill disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                上一页
              </Button>
              <span className="text-muted">
                {data!.pagination.page} / {data!.pagination.totalPages}
              </span>
              <Button
                size="sm" variant="ghost" pill
                disabled={page >= data!.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
