/** 举报管理：状态筛选 + 举报卡片 + 处理弹窗（关闭/禁言/封禁/删除内容） */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button, Modal, Skeleton, Textarea } from '@/components/ui/primitives';
import { relativeTime } from '@/lib/utils';
import { REASON_LABEL, Tag, type AdminPagination, type ReportItem } from './shared';

const STATUS_LABEL: Record<string, { label: string; tone: 'warn' | 'ok' | 'plain' }> = {
  pending: { label: '待处理', tone: 'warn' },
  resolved: { label: '已处理', tone: 'ok' },
  dismissed: { label: '已关闭', tone: 'plain' },
};

export default function AdminReports() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });
  const [status, setStatus] = useState('pending');
  const [page] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', status],
    queryFn: () =>
      api<{ reports: ReportItem[]; pagination: AdminPagination }>(
        `/api/admin/reports?page=${page}&pageSize=30&status=${status}`,
      ),
  });

  const [handleTarget, setHandleTarget] = useState<ReportItem | null>(null);
  const [handleAction, setHandleAction] = useState('dismiss');
  const [handleDays, setHandleDays] = useState('7');
  const [handleNote, setHandleNote] = useState('');
  const [handling, setHandling] = useState(false);

  const handle = async () => {
    if (!handleTarget) return;
    if (handleAction !== 'dismiss' && handleAction !== 'delete_content' && !handleNote.trim()) {
      toast.error('请填写处理原因');
      return;
    }
    setHandling(true);
    try {
      await api(`/api/admin/reports/${handleTarget.id}/resolve`, {
        method: 'POST',
        body: {
          action: handleAction,
          note: handleNote,
          days: handleAction === 'mute' || handleAction === 'ban' ? (handleDays === 'permanent' ? null : Number(handleDays)) : undefined,
        },
      });
      toast.success(handleAction === 'dismiss' ? '已按无违规关闭' : '已处理');
      setHandleTarget(null);
      setHandleNote('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setHandling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(['pending', 'resolved', 'dismissed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
              status === s ? 'bg-brand text-white' : 'border border-line-strong text-muted hover:bg-surface2 hover:text-ink'
            }`}
          >
            {STATUS_LABEL[s].label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : (data?.reports.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">没有举报记录</p>
      ) : (
        <div className="space-y-2.5">
          {data!.reports.map((r) => {
            const typeLabel = r.targetType === 'post' ? '帖子' : r.targetType === 'reply' ? '回复' : '用户';
            const st = STATUS_LABEL[r.status] ?? { label: r.status, tone: 'plain' as const };
            return (
              <div key={r.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="plain">{typeLabel}</Tag>
                  <Tag tone={r.reason === 'spam' ? 'plain' : 'danger'}>{REASON_LABEL[r.reason] ?? r.reason}</Tag>
                  <Tag tone={st.tone}>{st.label}</Tag>
                  <span className="text-xs text-muted">
                    举报人 {r.reporterName} · {relativeTime(r.createdAt)}
                  </span>
                </div>
                {r.detail && <p className="mt-2 text-[13px] text-muted">举报说明：{r.detail}</p>}
                <div className="mt-2 rounded-xl border border-line bg-canvas p-3">
                  <p className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">被举报{typeLabel}：</span>
                    {r.targetAuthorName && <span className="font-bold">@{r.targetAuthorName}</span>}
                    {r.targetDeleted ? <Tag tone="danger">内容已删除</Tag> : null}
                  </p>
                  {r.targetTitle && <p className="mt-1 line-clamp-2 text-[13px] font-bold">{r.targetTitle}</p>}
                  {r.targetContent && <p className="mt-1 line-clamp-3 text-xs text-muted">{r.targetContent}</p>}
                </div>
                {r.resolutionNote && r.status !== 'pending' && (
                  <p className="mt-2 text-xs text-muted">处理结果：{r.resolutionNote}</p>
                )}
                {r.status === 'pending' && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      pill
                      onClick={() => {
                        setHandleTarget(r);
                        setHandleAction('dismiss');
                        setHandleNote('');
                      }}
                    >
                      处理
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 处理弹窗 */}
      <Modal open={Boolean(handleTarget)} onClose={() => setHandleTarget(null)} className="w-[92vw] max-w-md p-6">
        <h3 className="text-lg font-extrabold">处理举报</h3>
        <p className="mt-1 text-[13px] text-muted">被举报内容由系统留存，处理后仍可在此回溯查看。</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">处理方式</span>
            <select
              value={handleAction}
              onChange={(e) => setHandleAction(e.target.value)}
              className="h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-sm font-bold text-ink outline-none focus:border-brand"
            >
              <option value="dismiss">无违规（仅关闭举报）</option>
              <option value="mute">禁言作者</option>
              <option value="ban">封禁作者</option>
              <option value="delete_content">删除被举报内容</option>
            </select>
          </label>
          {(handleAction === 'mute' || handleAction === 'ban') && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">时长</span>
              <select
                value={handleDays}
                onChange={(e) => setHandleDays(e.target.value)}
                className="h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-sm font-bold text-ink outline-none focus:border-brand"
              >
                <option value="1">1 天</option>
                <option value="3">3 天</option>
                <option value="7">7 天</option>
                <option value="30">30 天</option>
                <option value="permanent">永久</option>
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">
              处理备注{handleAction !== 'dismiss' && handleAction !== 'delete_content' ? '（必填，会通知对方）' : ''}
            </span>
            <Textarea
              value={handleNote}
              onChange={(e) => setHandleNote(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" pill onClick={() => setHandleTarget(null)}>
            取消
          </Button>
          <Button variant={handleAction === 'dismiss' ? 'primary' : 'danger'} pill disabled={handling} onClick={() => void handle()}>
            确认处理
          </Button>
        </div>
      </Modal>
    </div>
  );
}
