/** 审计日志：时间 / 操作者 / 动作 / 目标 / 详情（管理员） */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/primitives';
import { PageNav, TableWrap, Td, Th, Tag, type AdminPagination, type AuditLogItem } from './shared';

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', page],
    queryFn: () => api<{ logs: AuditLogItem[]; pagination: AdminPagination }>(`/api/admin/audit-logs?page=${page}&pageSize=50`),
  });

  return (
    <div className="space-y-3">
      <TableWrap minWidth={900}>
        <thead>
          <tr>
            <Th>时间</Th>
            <Th>操作者</Th>
            <Th>动作</Th>
            <Th>目标</Th>
            <Th>详情</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={5}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (data?.logs ?? []).length === 0 ? (
            <tr>
              <Td colSpan={5} className="text-center text-xs text-muted">
                暂无审计记录
              </Td>
            </tr>
          ) : (
            (data?.logs ?? []).map((log) => (
              <tr key={log.id} className="transition hover:bg-surface2/60">
                <Td className="whitespace-nowrap text-xs text-muted">{log.createdAt}</Td>
                <Td className="whitespace-nowrap text-xs">{log.actorName ?? '—'}</Td>
                <Td className="whitespace-nowrap">
                  <Tag tone="plain" className="font-mono">
                    {log.action}
                  </Tag>
                </Td>
                <Td className="whitespace-nowrap text-xs">
                  {log.targetType}/{log.targetId ? log.targetId.slice(0, 10) : '—'}
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted">{log.detail ?? '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
      <PageNav pagination={data?.pagination} onPage={setPage} />
    </div>
  );
}
