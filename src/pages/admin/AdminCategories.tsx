/** 板块管理：列表 / 新建 / 编辑 / 删除 / 恢复默认 / 图标（emoji 或上传图片） */
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Input, Modal, Skeleton } from '@/components/ui/primitives';
import { listCategories, uploadImage } from '@/lib/endpoints';
import type { Category } from '@/lib/types';
import { ConfirmModal, Field, TableWrap, Td, Th } from './shared';

const CATEGORY_EMOJIS = [
  '📢', '💻', '💬', '❓', '🎨', '🎮', '📚', '🎬', '🎵', '⚽', '🍜', '✈️', '🌱', '🔧', '📷',
  '🧠', '🚀', '⭐', '🔥', '💡', '🏆', '🐾', '💼', '🛒', '📝', '🎓', '🏠', '❤️', '🌈', '☕',
];

function CategoryIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  if (/^(https?:\/\/|\/api\/)/.test(icon)) {
    return <img src={icon} alt="" className="rounded-md object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="inline-flex items-center justify-center" style={{ width: size, height: size, fontSize: size * 0.8 }}>
      {icon}
    </span>
  );
}

function IconPicker({ icon, onChange }: { icon: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadImage(file, 'category');
      onChange(res);
      toast.success('图片已上传，点击「创建/保存」生效');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface2">
          <CategoryIcon icon={icon} size={24} />
        </span>
        <Input
          value={/^(https?:\/\/|\/api\/)/.test(icon) ? '' : icon}
          onChange={(e) => onChange(e.target.value.slice(0, 4))}
          placeholder="emoji"
          className="h-10 w-20 text-center"
          maxLength={4}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? '上传中…' : '图片'}
        </Button>
        {icon && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X size={15} />
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {CATEGORY_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`rounded px-1.5 py-0.5 text-base leading-none transition hover:bg-surface2 ${
              icon === e ? 'bg-brand-soft ring-1 ring-brand' : ''
            }`}
            aria-label={`选择图标 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['categories'] });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (editId) {
        await api(`/api/admin/categories/${editId}`, { method: 'PATCH', body: { name, slug, description, icon } });
      } else {
        await api('/api/admin/categories', { method: 'POST', body: { name, slug, description, icon } });
      }
    },
    onSuccess: () => {
      toast.success(editId ? '板块已更新' : '板块已创建');
      setName('');
      setSlug('');
      setDescription('');
      setIcon('');
      setEditId(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      await api(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('板块已删除');
      setDeleteTarget(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  });

  const [restoring, setRestoring] = useState(false);
  const restoreDefaults = async () => {
    setRestoring(true);
    try {
      const res = await api<{ restored: string[] }>('/api/admin/categories/restore-defaults', { method: 'POST' });
      toast.success(res.restored.length ? `已恢复：${res.restored.join('、')}` : '默认板块完整，无需恢复');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <TableWrap minWidth={560}>
        <thead>
          <tr>
            <Th>板块</Th>
            <Th>Slug</Th>
            <Th>帖子数</Th>
            {isAdmin && <Th className="text-right">操作</Th>}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={4}>
                <Skeleton className="my-2 h-8" />
              </Td>
            </tr>
          ) : (
            (data?.categories ?? []).map((c) => (
              <tr key={c.id} className="transition hover:bg-surface2/60">
                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <CategoryIcon icon={c.icon} />
                    {c.name}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-xs text-muted">{c.slug}</Td>
                <Td className="whitespace-nowrap text-xs">{c.postCount}</Td>
                {isAdmin && (
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditId(c.id);
                          setName(c.name);
                          setSlug(c.slug);
                          setDescription(c.description);
                          setIcon(c.icon);
                        }}
                      >
                        <Pencil className="size-3.5" /> 编辑
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="size-3.5" /> 删除
                      </Button>
                    </div>
                  </Td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>

      {isAdmin && (
        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" disabled={restoring} onClick={() => void restoreDefaults()}>
                <RotateCcw className="size-3.5" /> 恢复默认板块
              </Button>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" maxLength={24} />
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug（小写字母数字）" />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述" maxLength={200} />
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">板块图标（emoji 或上传图片）</span>
            <IconPicker icon={icon} onChange={setIcon} />
          </div>
          <div className="flex justify-end">
            <Button pill onClick={() => create.mutate()} disabled={create.isPending || !name.trim() || !slug.trim()}>
              {editId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editId ? '保存' : '创建'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => remove.mutate()}
        title={`删除板块「${deleteTarget?.name}」？`}
        description={`该板块下有 ${deleteTarget?.postCount ?? 0} 篇帖子。删除后帖子不会被删除，但需要重新选择板块才能编辑。`}
        confirmText="确认删除"
        danger
      />
    </div>
  );
}
