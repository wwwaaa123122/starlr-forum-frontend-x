/** 帖子管理：状态筛选 + 置顶/精华/删除/恢复（版主及以上） */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button, Skeleton } from '@/components/ui/primitives';
import { relativeTime } from '@/lib/utils';
import { PageNav, TableWrap, Td, Th, Tag, type AdminPagination, type AdminPost } from './shared';

export default function AdminPosts() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });
  const [status, setStatus] = useState('normal');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', status, page],
    queryFn: () =>
      api<{ posts: AdminPost[]; pagination: AdminPagination }>(
        `/api/admin/posts?page=${page}&pageSize=30&status=${status}`,
      ),
  });

  const act = async (fn: () => Promise<unknown>, msg = '操作成功') => {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-3">
      <select
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
        className="h-9 rounded-full border border-line-strong bg-canvas px-3.5 text-[13px] font-bold text-ink outline-none focus:border-brand"
      >
        <option value="normal">正常帖子</option>
        <option value="deleted">已删除</option>
        <option value="all">全部</option>
      </select>

      <TableWrap minWidth={720}>
        <thead>
          <tr>
            <Th>标题</Th>
            <Th>作者</Th>
            <Th>板块</Th>
            <Th>状态</Th>
            <Th>发布时间</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={6}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (
            (data?.posts ?? []).map((p) => (
              <tr key={p.id} className="transition hover:bg-surface2/60">
                <Td className="max-w-64">
                  <Link to={`/post/${p.id}`} className="line-clamp-1 font-medium hover:underline">
                    {p.title}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-xs">{p.authorName}</Td>
                <Td className="whitespace-nowrap text-xs">{p.categoryName}</Td>
                <Td>
                  {p.isDeleted ? (
                    <Tag tone="danger">已删除</Tag>
                  ) : (
                    <span className="flex gap-1">
                      {Boolean(p.isPinned) && <Tag tone="brand">置顶</Tag>}
                      {Boolean(p.isFeatured) && <Tag tone="warn">精华</Tag>}
                      {!p.isPinned && !p.isFeatured && <Tag tone="plain">正常</Tag>}
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted">{relativeTime(p.createdAt)}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {p.isDeleted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => act(() => api(`/api/admin/posts/${p.id}/restore`, { method: 'POST' }), '已恢复')}
                      >
                        <RotateCcw className="size-3.5" /> 恢复
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            act(
                              () => api(`/api/admin/posts/${p.id}/${p.isPinned ? 'unpin' : 'pin'}`, { method: 'POST' }),
                              p.isPinned ? '已取消置顶' : '已置顶',
                            )
                          }
                        >
                          {p.isPinned ? '取消置顶' : '置顶'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            act(
                              () => api(`/api/admin/posts/${p.id}/${p.isFeatured ? 'unfeature' : 'feature'}`, { method: 'POST' }),
                              p.isFeatured ? '已取消精华' : '已加精',
                            )
                          }
                        >
                          {p.isFeatured ? '取消精华' : '加精'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => act(() => api(`/api/admin/posts/${p.id}`, { method: 'DELETE' }), '已删除')}
                        >
                          <Trash2 className="size-3.5" /> 删除
                        </Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
      <PageNav pagination={data?.pagination} onPage={setPage} />
    </div>
  );
}
