/** 注册页：用户名 / 邮箱 / 昵称 / 密码，成功后自动登录并提示邮箱验证 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Loader2, MailCheck, UserPlus } from 'lucide-react';
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
  const [agreed, setAgreed] = useState(false);

  const [emailRequired, setEmailRequired] = useState(true);
  useEffect(() => {
    void fetchSiteConfig().then((cfg) => {
      setSiteKey(cfg.turnstileSiteKey);
      setEmailRequired(cfg.emailRequired !== false);
    });
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('两次输入的密码不一致');
    if (!agreed) return toast.error('请先阅读并同意《用户协议》与《隐私政策》');
    setLoading(true);
    try {
      const user = await register({
        username: form.username.trim(),
        ...(emailRequired ? { email: form.email.trim() } : {}),
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
            {emailRequired
              ? '激活邮件已发送至你的邮箱。验证邮箱后即可发帖与回复；未验证前你可以自由浏览。'
              : '账号已创建，直接登录即可开始使用。'}
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
          <img src="/icon-512.png" alt="Starlr" className="h-12 w-12 rounded-[25%]" />
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              成为
              <br />
              <span className="bg-gradient-to-r from-brand to-star bg-clip-text text-transparent">Starlr 旅人</span>
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
            <img src="/icon-512.png" alt="" className="h-9 w-9 rounded-[25%]" />
            <span className="text-xl font-black">Starlr</span>
          </div>
          <h2 className="text-2xl font-extrabold">注册</h2>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-muted">用户名 *</span>
                <Input value={form.username} onChange={set('username')} placeholder="用户名" required minLength={3} maxLength={24} pattern="[\p{L}\p{N}_\-]+" title="用户名只能包含中文、字母、数字、下划线和短横线" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-muted">昵称</span>
                <Input value={form.nickname} onChange={set('nickname')} placeholder="选填" maxLength={24} />
              </label>
            </div>
            {emailRequired && (
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-semibold text-muted">邮箱 *</span>
                <span className="relative block">
                  <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                  <Input type="email" value={form.email} onChange={set('email')} placeholder="邮箱" required className="pl-10" />
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">密码 *</span>
              <Input type="password" value={form.password} onChange={set('password')} placeholder="8 位以上" required minLength={8} maxLength={128} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">确认密码 *</span>
              <Input type="password" value={form.confirm} onChange={set('confirm')} placeholder="再次输入密码" required minLength={8} />
            </label>
            <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
            <label className="flex cursor-pointer items-start gap-2 text-[13px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                aria-label="同意用户协议与隐私政策"
              />
              <span>
                我已阅读并同意
                <Link to="/terms" className="text-brand hover:underline">《用户协议》</Link> 和{' '}
                <Link to="/privacy" className="text-brand hover:underline">《隐私政策》</Link>。
              </span>
            </label>
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
        </div>
      </div>
    </div>
  );
}
