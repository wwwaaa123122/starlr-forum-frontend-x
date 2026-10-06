/** 版主管理：按板块任命（全站/单板块）、移除（管理员） */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button, Input, Skeleton } from '@/components/ui/primitives';
import { listCategories } from '@/lib/endpoints';
import { SITE_WIDE, TableWrap, Td, Th, type ModeratorRow, type SiteWideModerator } from './shared';
import { CatChip } from './AdminUsers';

export default function AdminModerators() {
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'moderators'] });
  const [username, setUsername] = useState('');
  const [pickedCats, setPickedCats] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: mods, isLoading } = useQuery({
    queryKey: ['admin', 'moderators'],
    queryFn: () => api<{ moderators: ModeratorRow[]; siteWide: SiteWideModerator[] }>('/api/admin/moderators'),
  });
  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });
  const categories = catsData?.categories ?? [];

  const toggleCat = (id: string) =>
    setPickedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const assign = async () => {
    if (!username.trim() || pickedCats.length === 0) {
      toast.error('请填写用户名并选择板块');
      return;
    }
    setBusy(true);
    try {
      let upgraded = false;
      if (pickedCats.includes(SITE_WIDE)) {
        const res = await api<{ upgraded?: boolean }>('/api/admin/moderators', {
          method: 'POST',
          body: { username: username.trim(), siteWide: true },
        });
        upgraded = Boolean(res.upgraded);
        toast.success(upgraded ? '已任命为全站版主（角色已升级）' : '已设为全站版主');
      } else {
        for (const cid of pickedCats) {
          const res = await api<{ upgraded?: boolean }>('/api/admin/moderators', {
            method: 'POST',
            body: { username: username.trim(), categoryId: cid },
          });
          upgraded = upgraded || Boolean(res.upgraded);
        }
        toast.success(upgraded ? `已任命为 ${pickedCats.length} 个板块的版主（角色已升级）` : `已添加 ${pickedCats.length} 个板块的版主任命`);
      }
      setUsername('');
      setPickedCats([]);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const removeRow = async (row: ModeratorRow) => {
    try {
      await api(`/api/admin/moderators/${row.userId}/${row.categoryId}`, { method: 'DELETE' });
      toast.success('已移除该板块的版主任命');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const revokeAll = async (sw: SiteWideModerator) => {
    try {
      await api(`/api/admin/moderators/${sw.userId}`, { method: 'DELETE' });
      toast.success('已撤销该用户全部版主权限');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 任命表单 */}
      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名或 UID" />
          <Button onClick={() => void assign()} disabled={busy || pickedCats.length === 0}>
            任命（{pickedCats.includes(SITE_WIDE) ? '全站' : pickedCats.length}）
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <CatChip
            picked={pickedCats.includes(SITE_WIDE)}
            onClick={() => setPickedCats((prev) => (prev.includes(SITE_WIDE) ? prev.filter((x) => x !== SITE_WIDE) : [SITE_WIDE]))}
          >
            🌐 全站管辖
          </CatChip>
          {pickedCats.includes(SITE_WIDE)
            ? null
            : (categories ?? []).map((cat) => (
                <CatChip key={cat.id} picked={pickedCats.includes(cat.id)} onClick={() => toggleCat(cat.id)}>
                  {cat.icon} {cat.name}
                </CatChip>
              ))}
        </div>
      </div>

      {/* 全站版主 */}
      {(mods?.siteWide ?? []).length > 0 && (
        <TableWrap minWidth={640}>
          <thead>
            <tr>
              <Th>全站版主</Th>
              <Th>UID</Th>
              <Th>任命时间</Th>
              <Th className="text-right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {(mods?.siteWide ?? []).map((sw) => (
              <tr key={sw.userId} className="transition hover:bg-surface2/60">
                <Td className="whitespace-nowrap">
                  <Link to={`/u/${sw.username}`} className="font-bold hover:underline">
                    {sw.nickname || sw.username}
                  </Link>
                  <span className="ml-2 text-xs text-muted">@{sw.username}</span>
                </Td>
                <Td className="font-mono text-xs">{sw.uid}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">{sw.createdAt}</Td>
                <Td className="text-right">
                  <Button variant="outline" size="sm" onClick={() => void revokeAll(sw)}>
                    撤销全部
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* 按板块版主 */}
      <TableWrap minWidth={680}>
        <thead>
          <tr>
            <Th>版主</Th>
            <Th>UID</Th>
            <Th>板块</Th>
            <Th>任命时间</Th>
            <Th className="text-right">操作</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={5}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (mods?.moderators ?? []).length === 0 ? (
            <tr>
              <Td colSpan={5} className="text-center text-xs text-muted">
                暂无版主任命
              </Td>
            </tr>
          ) : (
            (mods?.moderators ?? []).map((row) => (
              <tr key={`${row.userId}-${row.categoryId}`} className="transition hover:bg-surface2/60">
                <Td className="whitespace-nowrap">
                  <Link to={`/u/${row.username}`} className="font-bold hover:underline">
                    {row.nickname || row.username}
                  </Link>
                  <span className="ml-2 text-xs text-muted">@{row.username}</span>
                </Td>
                <Td className="font-mono text-xs">{row.uid}</Td>
                <Td className="whitespace-nowrap">{row.categoryName}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">{row.createdAt}</Td>
                <Td className="text-right">
                  <Button variant="outline" size="sm" onClick={() => void removeRow(row)}>
                    移除
                  </Button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}
