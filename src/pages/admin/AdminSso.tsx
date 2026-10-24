/** SSO 登录同步管理（管理员）：总开关 + 站点白名单 + 最近同步记录 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/primitives';
import { Skeleton } from '@/components/ui/primitives';
import { PageNav, TableWrap, Td, Th, type AdminPagination } from './shared';

interface SsoEvent {
  id: string;
  detail: string | null;
  ip: string | null;
  createdAt: string;
  actorName: string | null;
}

interface SsoConfig {
  enabled: boolean;
  origins: string[];
  source: 'kv' | 'env' | 'default';
  events: SsoEvent[];
}

const SOURCE_LABEL: Record<SsoConfig['source'], string> = {
  kv: '当前生效：管理后台配置',
  env: '当前生效：环境变量兜底（保存后接管）',
  default: '当前生效：内置默认（保存后接管）',
};

export default function AdminSso() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sso'],
    queryFn: () => api<SsoConfig>('/api/admin/sso/config'),
  });

  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setText(data.origins.join('\n'));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api<SsoConfig>('/api/admin/sso/config', {
        method: 'PUT',
        body: {
          enabled,
          origins: text
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      setError('');
      qc.invalidateQueries({ queryKey: ['admin', 'sso'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['admin', 'sso', 'events', page],
    queryFn: () =>
      api<{ logs: (SsoEvent & { action: string })[]; pagination: AdminPagination }>(
        `/api/admin/audit-logs?action=user.site_login&page=${page}&pageSize=15`,
      ),
    enabled: !!data,
  });

  if (isLoading || !data) {
    return <Skeleton className="my-4 h-40" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-surface2/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">站点登录同步</div>
            <div className="mt-1 text-xs text-muted">
              第三方站点（如 MC 免端口域名生成器）经一次性 ticket 同步论坛登录状态。关闭后所有站点的同步请求将被拒绝。
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {enabled ? '已启用' : '已停用'}
          </label>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs font-medium">允许同步登录状态的站点源（每行一个，如 https://zako.mom）</div>
          <textarea
            className="h-32 w-full resize-y rounded-md border border-line bg-surface p-2 font-mono text-xs outline-none focus:border-brand"
            value={text}
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-1 text-xs text-muted">{SOURCE_LABEL[data.source]} · 最多 50 个</div>
        </div>

        {error && <div className="mt-2 text-xs text-danger">{error}</div>}

        <div className="mt-3">
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? '保存中…' : '保存配置'}
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">最近同步记录</div>
        <TableWrap minWidth={640}>
          <thead>
            <tr>
              <Th>时间</Th>
              <Th>账号</Th>
              <Th>来源站点</Th>
              <Th>IP</Th>
            </tr>
          </thead>
          <tbody>
            {(eventsData?.logs ?? []).length === 0 ? (
              <tr>
                <Td colSpan={4} className="text-center text-xs text-muted">
                  还没有站点同步过登录状态
                </Td>
              </tr>
            ) : (
              (eventsData?.logs ?? []).map((log) => (
                <tr key={log.id} className="transition hover:bg-surface2/60">
                  <Td className="whitespace-nowrap text-xs text-muted">{log.createdAt}</Td>
                  <Td className="whitespace-nowrap text-xs">{log.actorName ?? '—'}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{(log.detail ?? '').replace(/^origin:/, '') || '—'}</Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{log.ip || '—'}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableWrap>
        <PageNav pagination={eventsData?.pagination} onPage={setPage} />
      </div>
    </div>
  );
}
