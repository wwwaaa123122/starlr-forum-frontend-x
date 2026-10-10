/** 设置页：资料 / 安全 / 会话管理，X 式分组卡 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Laptop,
  Loader2,
  LogOut,
  MapPin,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { ImageCropDialog } from '@/components/ui/ImageCropDialog';
import {
  bindGithubIntent,
  changePassword,
  githubOAuthBindUrl,
  resendVerification,
  revokeOthers,
  revokeSession,
  unbindGithub,
  updateMe,
  uploadImage,
} from '@/lib/endpoints';
import { GithubIcon } from '@/components/GithubIcon';
import type { MeUser } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Avatar, Button, Input, Spinner, Textarea } from '@/components/ui/primitives';
import { assetUrl } from '@/lib/base-url';
import { cn, displayName, relativeTime } from '@/lib/utils';

export default function Settings() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [initialized, setInitialized] = useState(false);
  /** 待裁剪的图片（头像 / 背景图） */
  const [cropTarget, setCropTarget] = useState<{ file: File; kind: 'avatar' | 'background' } | null>(null);

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
    onSuccess: (res) => {
      setUser(res.user);
      toast.success('资料已更新');
      void queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '更新失败'),
  });

  const bgFileRef = useRef<HTMLInputElement>(null);

  const backgroundMut = useMutation({
    mutationFn: (url: string | null) => updateMe({ backgroundUrl: url }),
    onSuccess: (res) => {
      setUser(res.user);
      toast.success('背景图已更新');
      void queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  });

  const backgroundUploadMut = useMutation({
    mutationFn: async (file: File) => uploadImage(file, 'background'),
    onSuccess: (url) => backgroundMut.mutate(url),
    onError: (e) => toast.error(e instanceof Error ? e.message : '上传失败'),
  });

  const likesPublicMut = useMutation({
    mutationFn: async (on: boolean) => {
      const res = await updateMe({ likesPublic: on });
      setUser(res.user);
      return res.user;
    },
    onSuccess: (u) => {
      toast.success(u.likesPublic ? '喜欢已公开，其他用户可在你的主页查看' : '喜欢已设为私密，仅自己可见');
      void queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '操作失败'),
  });

  const avatarMut = useMutation({
    mutationFn: async (file: File) => uploadImage(file, 'avatar'),
    onSuccess: (url) => {
      // 后端上传 purpose=avatar 时已直接写入 avatar_url（带 ?v= 防缓存），同步本地用户态
      if (user) setUser({ ...user, avatarUrl: url });
      toast.success('头像已更新');
      void queryClient.invalidateQueries({ queryKey: ['user', user?.username] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '上传失败'),
  });

  if (!user) return null;

  const isUnverified = user.accountStatus === 'unverified';

  const resendMut = useMutation({
    mutationFn: resendVerification,
    onSuccess: (res) => {
      toast.success(res.alreadyVerified ? '邮箱已验证，无需重发' : '验证邮件已发送，请查收（60 秒内仅可发送一次）');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '发送失败'),
  });

  return (
    <>
      <ColumnHeader title="设置" back subtitle={`@${user.username}`} />

      {/* 邮箱未验证提示 */}
      {isUnverified && (
        <div className="flex items-start gap-2.5 border-b border-line bg-star/10 px-4 py-3 text-sm">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-star" />
          <p className="leading-relaxed">
            邮箱尚未验证：验证后才能发帖、回复与上传图片。请查收激活邮件，或在站内
            <button
              type="button"
              className="font-semibold text-brand hover:underline disabled:opacity-60"
              disabled={resendMut.isPending}
              onClick={() => resendMut.mutate()}
            >
              {resendMut.isPending ? '发送中…' : '重新发送验证邮件'}
            </button>
            。
          </p>
        </div>
      )}

      {/* 主页背景图 */}
      <section className="border-b border-line px-4 py-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <ImageIcon size={18} /> 主页背景图
        </h2>
        <div
          className={cn(
            'relative h-[120px] overflow-hidden rounded-2xl border border-line md:h-[150px]',
            !user.backgroundUrl && 'bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_60%)]',
          )}
        >
          {user.backgroundUrl ? (
            <img src={assetUrl(user.backgroundUrl)} alt="主页背景图" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-faint">
              尚未设置 · 将显示在你的主页顶部
            </div>
          )}
          {backgroundUploadMut.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={22} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            pill
            size="sm"
            disabled={backgroundUploadMut.isPending}
            onClick={() => bgFileRef.current?.click()}
          >
            <Camera size={15} /> {user.backgroundUrl ? '更换背景' : '上传背景'}
          </Button>
          {user.backgroundUrl && (
            <Button
              variant="ghost"
              pill
              size="sm"
              className="text-danger"
              disabled={backgroundMut.isPending}
              onClick={() => backgroundMut.mutate(null)}
            >
              移除
            </Button>
          )}
          <span className="text-xs text-faint">宽幅横图最佳 · 可框选裁剪预览 · 自动压缩</span>
        </div>
        <input
          ref={bgFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setCropTarget({ file: f, kind: 'background' });
          }}
        />
      </section>

      {/* 隐私 */}
      <section className="border-b border-line px-4 py-5">
        <h2 className="mb-4 text-lg font-extrabold">隐私</h2>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              {user.likesPublic ? <Eye size={16} className="text-brand" /> : <EyeOff size={16} className="text-muted" />}
              公开我的喜欢
            </p>
            <p className="mt-0.5 text-xs text-muted">
              开启后其他用户可在你的主页查看你点赞过的帖子；关闭时仅自己可见。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(user.likesPublic)}
            disabled={likesPublicMut.isPending}
            onClick={() => likesPublicMut.mutate(!user.likesPublic)}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors',
              user.likesPublic ? 'bg-brand' : 'bg-line-strong',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-6 rounded-full bg-white shadow transition-all',
                user.likesPublic ? 'left-[22px]' : 'left-0.5',
              )}
            />
          </button>
        </div>
      </section>

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
            <p className="mt-1.5 text-xs text-faint">≤ 2MB · JPEG/PNG/WEBP（可框选裁剪）· GIF 直接使用</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              // GIF 直接上传（裁剪会丢失动画帧）
              if (f.type === 'image/gif') {
                avatarMut.mutate(f);
                return;
              }
              setCropTarget({ file: f, kind: 'avatar' });
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

      <GithubBindingSection />

      <PasswordSection />

      <ImageCropDialog
        open={Boolean(cropTarget)}
        file={cropTarget?.file ?? null}
        title={cropTarget?.kind === 'avatar' ? '裁剪头像' : '裁剪主页背景图'}
        aspect={cropTarget?.kind === 'avatar' ? 1 : 3}
        circular={cropTarget?.kind === 'avatar'}
        preview={cropTarget?.kind === 'background'}
        onCancel={() => setCropTarget(null)}
        onConfirm={(cropped) => {
          const kind = cropTarget?.kind;
          setCropTarget(null);
          if (kind === 'avatar') avatarMut.mutate(cropped);
          else if (kind === 'background') backgroundUploadMut.mutate(cropped);
        }}
      />

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


/** 账号绑定：GitHub（绑定走 OAuth 跳转，解绑需密码确认） */
function GithubBindingSection() {
  const { user, setUser } = useAuth();
  const bound = Boolean(user?.hasGithub);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');

  const bindMut = useMutation({
    mutationFn: async () => {
      const { bindToken } = await bindGithubIntent();
      window.location.href = githubOAuthBindUrl(bindToken);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '发起绑定失败'),
  });

  const unbindMut = useMutation({
    mutationFn: () => unbindGithub(password),
    onSuccess: (res) => {
      setUser(res.user as unknown as MeUser);
      toast.success('已解绑 GitHub');
      setConfirming(false);
      setPassword('');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '解绑失败'),
  });

  return (
    <section className="border-b border-line px-4 py-5">
      <h2 className="mb-4 text-lg font-extrabold">账号绑定</h2>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full border border-line">
            <GithubIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">GitHub</p>
            <p className="truncate text-[13px] text-muted">
              {bound ? '已绑定，登录页可直接用 GitHub 登录' : '绑定后可在登录页使用 GitHub 一键登录'}
            </p>
          </div>
        </div>
        {bound ? (
          <Button size="sm" variant="ghost" disabled={unbindMut.isPending} onClick={() => setConfirming((v) => !v)}>
            解绑
          </Button>
        ) : (
          <Button pill size="sm" disabled={bindMut.isPending} onClick={() => bindMut.mutate()}>
            {bindMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <GithubIcon size={14} />} 绑定
          </Button>
        )}
      </div>
      {confirming && (
        <form
          className="mt-3 rounded-xl border border-line bg-surface2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!password) return toast.error('请输入密码');
            unbindMut.mutate();
          }}
        >
          <p className="mb-2 text-[13px] text-muted">为防止盗号解绑，请输入当前账号密码确认（GitHub 注册、未设置过密码的账号暂无法解绑）。</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="账号密码"
              autoComplete="current-password"
              className="flex-1"
            />
            <Button pill disabled={unbindMut.isPending}>
              {unbindMut.isPending ? <Loader2 size={14} className="animate-spin" /> : null} 确认解绑
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

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
          {(data?.sessions ?? []).map((s) => {
            const dev = describeDevice(s.device);
            const Icon = dev.kind === 'mobile' ? Smartphone : dev.kind === 'tablet' ? Tablet : Laptop;
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3',
                  s.current && 'border-brand/50',
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface2 text-ink">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {dev.label}
                    {s.current && (
                      <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">当前</span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span className="font-semibold">{dev.browser}</span>
                    <span className="text-faint">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> {s.location || '位置未知'}
                    </span>
                    {s.colo && <span className="text-faint">· 节点 {s.colo}</span>}
                    <span className="text-faint">·</span>
                    <span className="font-mono">{s.ip || 'IP 未知'}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-faint">
                    最近活跃 {relativeTime(s.lastUsedAt || s.loginAt)} · 登录于 {relativeTime(s.loginAt)}
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
            );
          })}
          {(data?.sessions ?? []).length === 0 && (
            <p className="text-sm text-muted">暂无其他设备记录</p>
          )}
        </div>
      )}
    </section>
  );
}

/** 解析 User-Agent 为设备类型 / 浏览器名（与后端 device_info.ua 对应） */
function describeDevice(ua: string): { kind: 'mobile' | 'tablet' | 'desktop'; label: string; browser: string } {
  const s = ua || '';
  const isTablet = /iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const isMobile = /iPhone|iPod|Mobile/i.test(s) || (/Android/i.test(s) && !isTablet);
  const kind = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
  const label = isTablet ? '平板设备' : isMobile ? '手机设备' : '电脑设备';
  const browser = /Edg\//.test(s)
    ? 'Edge'
    : /MicroMessenger/i.test(s)
      ? '微信内置浏览器'
      : /QQ\//i.test(s)
        ? 'QQ 内置浏览器'
        : /Chrome\//.test(s)
          ? 'Chrome'
          : /Firefox\//.test(s)
            ? 'Firefox'
            : /Safari\//.test(s)
              ? 'Safari'
              : '浏览器';
  return { kind, label, browser };
}
