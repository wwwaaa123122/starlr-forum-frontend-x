/** 注册页：用户名 / 邮箱 / 昵称 / 密码，成功后自动登录并提示邮箱验证 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Loader2, MailCheck, ShieldAlert, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui/primitives';
import { Turnstile, fetchSiteConfig } from '@/components/Turnstile';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', nickname: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>(null);

  useEffect(() => {
    void fetchSiteConfig().then((cfg) => setSiteKey(cfg.turnstileSiteKey));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('两次输入的密码不一致');
    setLoading(true);
    try {
      const user = await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        nickname: form.nickname.trim() || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      setDone(true);
      toast.success(`欢迎加入，${user.nickname || user.username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
          <MailCheck size={44} className="mx-auto text-boost" strokeWidth={1.4} />
          <h1 className="mt-4 text-2xl font-extrabold">启程成功 ✦</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            激活邮件已发送至你的邮箱。验证邮箱后即可发帖与回复；
            未验证前你可以自由浏览。
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button pill onClick={() => navigate('/')}>
              去逛逛
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh md:items-center md:justify-center md:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden md:grid-cols-2 md:rounded-2xl md:border md:border-line md:shadow-2xl">
        {/* 品牌区 */}
        <div className="relative hidden flex-col justify-between bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(255,200,87,0.12),transparent_55%)] p-10 md:flex">
          <img src="/starlr.svg" alt="Starlr" className="h-12 w-12" />
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              成为
              <br />
              <span className="bg-gradient-to-r from-brand to-star bg-clip-text text-transparent">星辰旅人</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              每个账号都有唯一 UID，从 1 开始计数。
              <br />
              今天注册的你，也许正是第 2048 颗星。
            </p>
          </div>
          <p className="text-xs text-faint">注册即发送激活邮件 · 24 小时内有效</p>
        </div>

        {/* 表单区 */}
        <div className="bg-canvas p-8 sm:p-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <img src="/starlr.svg" alt="" className="h-9 w-9" />
            <span className="text-xl font-black">Starlr</span>
          </div>
          <h2 className="text-2xl font-extrabold">注册</h2>
          <p className="mt-1 text-sm text-muted">点亮你的第一颗星</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-muted">用户名 *</span>
                <Input value={form.username} onChange={set('username')} placeholder="star-lighter" required minLength={3} maxLength={24} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-muted">昵称</span>
                <Input value={form.nickname} onChange={set('nickname')} placeholder="星尘旅人" maxLength={24} />
              </label>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">邮箱 *</span>
              <div className="relative">
                <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <Input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required className="pl-10" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">密码 *（至少 8 位）</span>
              <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={8} maxLength={128} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">确认密码 *</span>
              <Input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" required minLength={8} />
            </label>
            <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
            <Button pill size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <UserPlus size={17} />} 创建账号
            </Button>
          </form>

          <div className="mt-5 text-sm">
            <span className="text-muted">已有账号？</span>{' '}
            <Link to="/login" className="font-semibold text-brand hover:underline">
              直接登录
            </Link>
          </div>
          <p className="mt-6 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
            <ShieldAlert size={12} className="mt-0.5 shrink-0 text-star" />
            密码以 PBKDF2 加密存储；本站不会向任何第三方透露你的邮箱。
          </p>
        </div>
      </div>
    </div>
  );
}
