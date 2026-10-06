/** 管理员配置：按 UID 授权（管理员/版主）、撤销（管理员，不可撤销自己） */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Input, Skeleton } from '@/components/ui/primitives';
import { relativeTime } from '@/lib/utils';
import { listCategories } from '@/lib/endpoints';
import { ConfirmModal, TableWrap, Td, Th, Tag, type AdminStaff } from './shared';
import { CatChip } from './AdminUsers';

export default function AdminAdmins() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const [uid, setUid] = useState('');
  const [role, setRole] = useState<'admin' | 'moderator'>('admin');
  const [pickedCats, setPickedCats] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminStaff | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: () => api<{ admins: AdminStaff[]; ownerEmail: string | null }>('/api/admin/admins'),
  });
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });
  const categories = catsData?.categories ?? [];

  const toggleCat = (id: string) =>
    setPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const grant = async () => {
    const uidNum = Number.parseInt(uid, 10);
    if (!Number.isInteger(uidNum) || uidNum <= 0) {
      toast.error('请输入有效的 UID（正整数）');
      return;
    }
    setSubmitting(true);
    try {
      if (role === 'moderator' && pickedCats.length > 0) {
        const res = await api<{ user: { uid: number; username: string } }>('/api/admin/admins', {
          method: 'POST',
          body: { uid: uidNum, role },
        });
        for (const cid of pickedCats) {
          await api('/api/admin/moderators', { method: 'POST', body: { username: res.user.username, categoryId: cid } });
        }
        toast.success(`已将 UID ${uidNum}（@${res.user.username}）设为版主并任命 ${pickedCats.length} 个板块`);
      } else {
        const res = await api<{ unchanged?: boolean; user: { uid: number; username: string; role: string } }>('/api/admin/admins', {
          method: 'POST',
          body: { uid: uidNum, role },
        });
        toast.success(
          res.unchanged
            ? `UID ${uidNum} 已经是该角色`
            : `已将 UID ${uidNum}（@${res.user.username}）设为${role === 'admin' ? '管理员' : '版主'}`,
        );
      }
      setUid('');
      setPickedCats([]);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (staff: AdminStaff) => {
    try {
      await api(`/api/admin/admins/${staff.uid}`, { method: 'DELETE' });
      toast.success(`已撤销 UID ${staff.uid} 的管理权限`);
      setRevokeTarget(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 授权表单 */}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h3 className="text-[15px] font-extrabold">授权新管理员</h3>
        <p className="text-xs text-muted">
          输入目标用户的 UID（注册时自动分配，管理员为 UID 1），即可授予管理员或版主权限。
          管理告警发送至 UID 1 邮箱：{data?.ownerEmail ?? '（UID 1 未设置邮箱）'}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">UID</span>
            <Input
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-32"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">角色</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'moderator')}
              className="h-10 rounded-xl border border-line-strong bg-canvas px-3 text-sm font-bold text-ink outline-none focus:border-brand"
            >
              <option value="admin">管理员</option>
              <option value="moderator">版主</option>
            </select>
          </label>
          {role === 'moderator' && (
            <div className="flex w-full flex-wrap gap-2">
              {(categories ?? []).map((cat) => (
                <CatChip key={cat.id} picked={pickedCats.includes(cat.id)} onClick={() => toggleCat(cat.id)}>
                  {cat.icon} {cat.name}
                </CatChip>
              ))}
            </div>
          )}
          <Button onClick={() => void grant()} disabled={submitting || !uid}>
            <ShieldCheck className="size-4" /> {submitting ? '授权中…' : '授权'}
          </Button>
        </div>
      </div>

      {/* 现有管理员/版主列表 */}
      <TableWrap minWidth={860}>
        <thead>
          <tr>
            <Th className="w-16">UID</Th>
            <Th>用户名</Th>
            <Th>昵称</Th>
            <Th>邮箱</Th>
            <Th>角色</Th>
            <Th>最后登录</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={7}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (
            (data?.admins ?? []).map((a) => (
              <tr key={a.id} className="transition hover:bg-surface2/60">
                <Td className="whitespace-nowrap font-mono text-xs">{a.uid}</Td>
                <Td className="font-bold">
                  <Link to={`/u/${a.username}`} className="hover:underline">
                    {a.username}
                  </Link>
                  {a.id === me?.id && <Tag tone="brand" className="ml-2">我</Tag>}
                </Td>
                <Td className="whitespace-nowrap text-xs">{a.nickname}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">{a.email}</Td>
                <Td>
                  <Tag tone={a.role === 'admin' ? 'brand' : 'plain'}>{a.role === 'admin' ? '管理员' : '版主'}</Tag>
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted">{a.lastLoginAt ? relativeTime(a.lastLoginAt) : '—'}</Td>
                <Td className="text-right">
                  <Button variant="outline" size="sm" disabled={a.id === me?.id} onClick={() => setRevokeTarget(a)}>
                    <Trash2 className="size-3.5" /> 撤销
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      <ConfirmModal
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => revokeTarget && revoke(revokeTarget)}
        title={`撤销 UID ${revokeTarget?.uid}（@${revokeTarget?.username}）的管理权限？`}
        confirmText="确认撤销"
        danger
      />
    </div>
  );
}
