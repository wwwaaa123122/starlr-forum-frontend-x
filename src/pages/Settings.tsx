/** 设置页：资料 / 安全 / 会话管理，X 式分组卡 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { changePassword, revokeOthers, revokeSession, updateMe, uploadImage } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { Avatar, Button, Input, Spinner, Textarea } from '@/components/ui/primitives';
import { cn, displayName, relativeTime } from '@/lib/utils';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    document.title = '设置 - Starlr Forum';
  }, []);

  useEffect(() => {
    if (user && !initialized) {
      setNickname(user.nickname || '');
      setBio(user.bio ?? '');
      setInitialized(true);
    }
  }, [user, initialized]);

  const profileMut = useMutation({
    mutationFn: () => updateMe({ nickname: nickname.trim(), bio }),
    onSuccess: () => {
      toast.success('资料已更新');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '更新失败'),
  });

  const avatarMut = useMutation({
    mutationFn: async (file: File) => uploadImage(file, 'avatar'),
    onSuccess: () => {
      toast.success('头像已更新');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '上传失败'),
  });

  if (!user) return null;

  const isUnverified = user.accountStatus === 'unverified';

  return (
    <>
      <ColumnHeader title="设置" back subtitle={`@${user.username}`} />

      {/* 邮箱未验证提示 */}
      {isUnverified && (
        <div className="flex items-start gap-2.5 border-b border-line bg-star/10 px-4 py-3 text-sm">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-star" />
          <p className="leading-relaxed">
            邮箱尚未验证：验证后才能发帖、回复与上传图片。请查收激活邮件，或在站内
            <span className="font-semibold"> 重新发送验证邮件</span>。
          </p>
        </div>
      )}

      {/* 头像 */}
      <section className="border-b border-line px-4 py-5">
        <h2 className="mb-4 text-lg font-extrabold">头像</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={user.avatarUrl} name={displayName(user.nickname || user.username)} size={72} />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="更换头像"
              className="btn-icon absolute inset-0 bg-black/40 text-white opacity-0 transition hover:opacity-100 focus-visible:opacity-100"
            >
              {avatarMut.isPending ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            </button>
          </div>
          <div className="text-sm">
            <Button variant="outline" pill size="sm" onClick={() => fileRef.current?.click()}>
              更换头像
            </Button>
            <p className="mt-1.5 text-xs text-faint">≤ 2MB · JPEG/PNG/GIF/WEBP</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) avatarMut.mutate(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      {/* 资料 */}
      <section className="border-b border-line px-4 py-5">
        <h2 className="mb-4 text-lg font-extrabold">资料</h2>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <UserRound size={13} /> 昵称
            </span>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-muted">简介（支持链接）</span>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="介绍一下你的星际旅程…"
            />
          </label>
          <div className="flex justify-end">
            <Button pill disabled={profileMut.isPending} onClick={() => profileMut.mutate()}>
              {profileMut.isPending ? <Loader2 size={15} className="animate-spin" /> : null} 保存
            </Button>
          </div>
        </div>
      </section>

      <PasswordSection />

      <SessionsSection />

      {/* 危险区 */}
      <section className="border-b border-line px-4 py-5">
        <h2 className="mb-4 text-lg font-extrabold">账号</h2>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            pill
            className="justify-start"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={15} /> 退出当前设备
          </Button>
          <Button
            variant="outline"
            pill
            className="justify-start text-danger"
            onClick={async () => {
              if (!confirm('退出所有其他设备的登录状态？')) return;
              try {
                await revokeOthers();
                toast.success('其他设备已全部下线');
              } catch (e) {
                toast.error(e instanceof Error ? e.message : '操作失败');
              }
            }}
          >
            <Trash2 size={15} /> 下线所有其他设备
          </Button>
        </div>
      </section>
    </>
  );
}

/* ---------------- 修改密码 ---------------- */

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const mut = useMutation({
    mutationFn: () => changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast.success('密码已修改，其他设备已强制下线');
      setCurrent('');
      setNext('');
      setConfirm('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '修改失败'),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return toast.error('两次输入的新密码不一致');
    mut.mutate();
  };

  return (
    <section className="border-b border-line px-4 py-5">
      <h2 className="mb-4 text-lg font-extrabold">安全</h2>
      <form onSubmit={submit} className="max-w-md space-y-3">
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="当前密码"
          autoComplete="current-password"
          required
        />
        <Input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="新密码（至少 8 位）"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="确认新密码"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <div className="flex justify-end">
          <Button pill type="submit" disabled={mut.isPending}>
            {mut.isPending ? <Loader2 size={15} className="animate-spin" /> : null} 修改密码
          </Button>
        </div>
      </form>
    </section>
  );
}

/* ---------------- 会话管理 ---------------- */

function SessionsSection() {
  const { data, isLoading } = useQuery({ queryKey: ['me-sessions'], queryFn: () => import('@/lib/endpoints').then((m) => m.mySessions()) });
  const queryClient = useQueryClient();

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => {
      toast.success('该设备已下线');
      void queryClient.invalidateQueries({ queryKey: ['me-sessions'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  });

  return (
    <section className="border-b border-line px-4 py-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
        <MonitorSmartphone size={18} /> 登录设备
      </h2>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.sessions ?? []).map((s) => (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3',
                s.current && 'border-brand/50',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {s.deviceInfo || '未知设备'}
                  {s.current && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">当前</span>}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {s.ip ? `${s.ip} · ` : ''}登录于 {relativeTime(s.createdAt)}
                </p>
              </div>
              {!s.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger"
                  disabled={revokeMut.isPending}
                  onClick={() => revokeMut.mutate(s.id)}
                >
                  下线
                </Button>
              )}
            </div>
          ))}
          {(data?.sessions ?? []).length === 0 && (
            <p className="text-sm text-muted">暂无其他设备记录</p>
          )}
        </div>
      )}
    </section>
  );
}
