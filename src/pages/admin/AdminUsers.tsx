/** 用户管理：搜索 / 角色 / 封禁 / 禁言 / 激活（管理员） */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle, Mic, MicOff, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Input, Modal, Skeleton, Textarea } from '@/components/ui/primitives';
import { relativeTime } from '@/lib/utils';
import { listCategories } from '@/lib/endpoints';
import {
  Field,
  PageNav,
  SITE_WIDE,
  TableWrap,
  Td,
  Th,
  Tag,
  type AdminPagination,
  type AdminUser,
} from './shared';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const [muteTarget, setMuteTarget] = useState<AdminUser | null>(null);
  const [muteReason, setMuteReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('7');
  const [customDays, setCustomDays] = useState('3');
  const [modTarget, setModTarget] = useState<AdminUser | null>(null);
  const [pickedCats, setPickedCats] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', query, page],
    queryFn: () =>
      api<{ users: AdminUser[]; pagination: AdminPagination }>(
        `/api/admin/users?page=${page}&pageSize=20${query ? `&query=${encodeURIComponent(query)}` : ''}`,
      ),
  });

  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin'] });

  const act = async (path: string, body?: unknown, msg = '操作成功') => {
    try {
      await api(`/api/admin/${path}`, { method: 'POST', body });
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const muteDaysValue = (): number | null => {
    if (muteDuration === 'permanent') return null;
    if (muteDuration === 'custom') {
      const n = Number.parseInt(customDays, 10);
      return Number.isFinite(n) && n > 0 ? Math.min(n, 3650) : 1;
    }
    return Number(muteDuration);
  };

  const muteUser = async () => {
    if (!muteTarget || !muteReason.trim()) {
      toast.error('请填写禁言原因');
      return;
    }
    try {
      await api(`/api/admin/users/${muteTarget.id}/mute`, { method: 'POST', body: { reason: muteReason, days: muteDaysValue() } });
      toast.success('已禁言');
      setMuteTarget(null);
      setMuteReason('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const banUser = async () => {
    if (!banTarget || !banReason.trim()) {
      toast.error('请填写封禁原因');
      return;
    }
    try {
      await api(`/api/admin/users/${banTarget.id}/ban`, {
        method: 'POST',
        body: { reason: banReason, days: banDays === 'permanent' ? null : Number(banDays) },
      });
      toast.success('已封禁');
      setBanTarget(null);
      setBanReason('');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  // 授予版主：改角色 + 按板块任命
  const { data: catsForModData } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    enabled: Boolean(modTarget),
  });
  const catsForMod = catsForModData?.categories ?? [];
  const toggleCat = (id: string) =>
    setPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const grantModerator = async () => {
    if (!modTarget) return;
    if (pickedCats.length === 0) {
      toast.error('请至少选择一个板块');
      return;
    }
    try {
      await api(`/api/admin/users/${modTarget.id}/role`, { method: 'PATCH', body: { role: 'moderator' } });
      if (pickedCats.includes(SITE_WIDE)) {
        await api('/api/admin/moderators', { method: 'POST', body: { username: modTarget.username, siteWide: true } });
        toast.success(`已将 @${modTarget.username} 设为全站版主`);
      } else {
        for (const cid of pickedCats) {
          await api('/api/admin/moderators', { method: 'POST', body: { username: modTarget.username, categoryId: cid } });
        }
        toast.success(`已任命 @${modTarget.username} 为 ${pickedCats.length} 个板块的版主`);
      }
      setModTarget(null);
      setPickedCats([]);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="搜索 UID / 用户名 / 昵称 / 邮箱…"
          className="pl-9"
        />
      </div>

      <TableWrap minWidth={860}>
        <thead>
          <tr>
            <Th className="w-16">UID</Th>
            <Th>用户</Th>
            <Th>邮箱</Th>
            <Th>角色</Th>
            <Th>状态</Th>
            <Th>发帖 / 回复</Th>
            <Th>最后登录</Th>
            {isAdmin && <Th className="text-right">操作</Th>}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={8}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (
            (data?.users ?? []).map((u) => {
              const muted = Boolean(u.mutedUntil || u.mutedPermanent);
              return (
                <tr key={u.id} className="transition hover:bg-surface2/60">
                  <Td className="whitespace-nowrap font-mono text-xs">{u.uid}</Td>
                  <Td className="whitespace-nowrap font-bold">
                    <Link to={`/u/${u.username}`} className="hover:underline">
                      {u.nickname || u.username}
                    </Link>
                    <span className="ml-1.5 text-xs font-normal text-muted">@{u.username}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">{u.email}</Td>
                  <Td>
                    {isAdmin ? (
                      <select
                        value={u.role}
                        onChange={(e) => {
                          const role = e.target.value;
                          if (role === u.role) return;
                          if (role === 'moderator') {
                            setModTarget(u);
                            return;
                          }
                          void api<{ scopeCleared?: boolean }>(`/api/admin/users/${u.id}/role`, { method: 'PATCH', body: { role } }).then(
                            (res) => {
                              toast.success(res.scopeCleared ? '已改为普通用户，辖区任命一并清空' : '角色已更新');
                              refresh();
                            },
                            (err) => toast.error(err instanceof Error ? err.message : '操作失败'),
                          );
                        }}
                        className="h-8 rounded-lg border border-line-strong bg-canvas px-2 text-xs font-bold text-ink outline-none focus:border-brand"
                      >
                        <option value="user">用户</option>
                        <option value="moderator">版主</option>
                        <option value="admin">管理员</option>
                      </select>
                    ) : (
                      <Tag tone="plain">{u.role}</Tag>
                    )}
                  </Td>
                  <Td>
                    {u.status === 'banned' ? (
                      <Tag tone="danger">已封禁</Tag>
                    ) : !u.emailVerified ? (
                      <Tag tone="warn">未验证</Tag>
                    ) : muted ? (
                      <Tag tone="warn">禁言中</Tag>
                    ) : (
                      <Tag tone="ok">正常</Tag>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {u.postCount} / {u.replyCount}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    {u.lastLoginAt ? relativeTime(u.lastLoginAt) : '—'}
                  </Td>
                  {isAdmin && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {u.status === 'active' ? (
                          <Button variant="outline" size="sm" onClick={() => setBanTarget(u)}>
                            <Ban className="size-3.5" /> 封禁
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => act(`users/${u.id}/unban`, {}, '已解封')}>
                            <CheckCircle className="size-3.5" /> 解封
                          </Button>
                        )}
                        {u.status !== 'banned' && !u.emailVerified && (
                          <Button variant="outline" size="sm" onClick={() => act(`users/${u.id}/verify`, {}, '已激活')}>
                            <CheckCircle className="size-3.5" /> 激活
                          </Button>
                        )}
                        {muted ? (
                          <Button
                            variant="outline"
                            size="sm"
                            title={u.mutedPermanent ? '永久禁言' : `禁言至 ${u.mutedUntil?.replace('T', ' ').slice(0, 16)}`}
                            onClick={() => act(`users/${u.id}/unmute`, {}, '已解除禁言')}
                          >
                            <Mic className="size-3.5" /> 解除禁言
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setMuteTarget(u)} disabled={u.role === 'admin'}>
                            <MicOff className="size-3.5" /> 禁言
                          </Button>
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </TableWrap>
      <PageNav pagination={data?.pagination} onPage={setPage} />

      {/* 封禁弹窗 */}
      <Modal open={Boolean(banTarget)} onClose={() => setBanTarget(null)} className="w-[92vw] max-w-md p-6">
        <h3 className="text-lg font-extrabold">封禁用户 {banTarget?.username}</h3>
        <div className="mt-4 space-y-3">
          <Field label="原因">
            <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} />
          </Field>
          <Field label="时长">
            <select
              value={banDays}
              onChange={(e) => setBanDays(e.target.value)}
              className="h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-sm font-bold text-ink outline-none focus:border-brand"
            >
              <option value="1">1 天</option>
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="permanent">永久</option>
            </select>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" pill onClick={() => setBanTarget(null)}>
            取消
          </Button>
          <Button variant="danger" pill onClick={() => void banUser()}>
            封禁
          </Button>
        </div>
      </Modal>

      {/* 禁言弹窗 */}
      <Modal open={Boolean(muteTarget)} onClose={() => setMuteTarget(null)} className="w-[92vw] max-w-md p-6">
        <h3 className="text-lg font-extrabold">禁言用户 {muteTarget?.username}</h3>
        <div className="mt-4 space-y-3">
          <Field label="原因">
            <Textarea value={muteReason} onChange={(e) => setMuteReason(e.target.value)} rows={2} />
          </Field>
          <Field label="时长">
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value)}
              className="h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-sm font-bold text-ink outline-none focus:border-brand"
            >
              <option value="1">1 天</option>
              <option value="3">3 天</option>
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="custom">自定义…</option>
              <option value="permanent">永久</option>
            </select>
          </Field>
          {muteDuration === 'custom' && (
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={3650} value={customDays} onChange={(e) => setCustomDays(e.target.value)} className="w-24" />
              <span className="text-sm text-muted">天（1–3650）</span>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" pill onClick={() => setMuteTarget(null)}>
            取消
          </Button>
          <Button pill onClick={() => void muteUser()}>
            确认禁言
          </Button>
        </div>
      </Modal>

      {/* 版主管辖选择弹窗 */}
      <Modal open={Boolean(modTarget)} onClose={() => setModTarget(null)} className="w-[92vw] max-w-md p-6">
        <h3 className="text-lg font-extrabold">授予 @{modTarget?.username} 版主权限</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <CatChip
            picked={pickedCats.includes(SITE_WIDE)}
            onClick={() => setPickedCats((prev) => (prev.includes(SITE_WIDE) ? prev.filter((x) => x !== SITE_WIDE) : [SITE_WIDE]))}
          >
            🌐 全站管辖
          </CatChip>
          {pickedCats.includes(SITE_WIDE)
            ? null
            : (catsForMod ?? []).map((cat) => (
                <CatChip key={cat.id} picked={pickedCats.includes(cat.id)} onClick={() => toggleCat(cat.id)}>
                  {cat.icon} {cat.name}
                </CatChip>
              ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" pill onClick={() => setModTarget(null)}>
            取消
          </Button>
          <Button pill onClick={() => void grantModerator()} disabled={pickedCats.length === 0}>
            确认授予
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** 板块选择 chip */
export function CatChip({ picked, onClick, children }: { picked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        picked ? 'border-brand bg-brand text-white' : 'border-line-strong text-ink hover:bg-surface2'
      }`}
    >
      {children}
    </button>
  );
}
