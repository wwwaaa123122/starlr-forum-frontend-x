/** 登录页：左右分栏品牌区（桌面） + 表单（移动单栏） */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Loader2, LogIn, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { forgotPassword } from '@/lib/endpoints';
import { Button, Input } from '@/components/ui/primitives';
import { Turnstile, fetchSiteConfig } from '@/components/Turnstile';
import { githubOAuthStartUrl } from '@/lib/endpoints';
import { GithubIcon } from '@/components/GithubIcon';


export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [siteKey, setSiteKey] = useState<string | null>(null);
  /** 找回密码：后端发重置邮件 → /reset-password 页设置新密码 */
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    void fetchSiteConfig().then((cfg) => setSiteKey(cfg.turnstileSiteKey));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return toast.error('请输入用户名/邮箱与密码');
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password, turnstileToken || undefined);
      toast.success(`欢迎回来，${user.nickname || user.username}`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return toast.error('请输入注册邮箱');
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail.trim());
      toast.success('如果该邮箱已注册，重置邮件已发送，请在 30 分钟内完成重置');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发送失败');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh md:items-center md:justify-center md:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden md:grid-cols-2 md:rounded-2xl md:border md:border-line md:shadow-2xl">
        {/* 品牌区 */}
        <div className="relative hidden flex-col justify-between bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(58,210,159,0.14),transparent_55%)] p-10 md:flex">
          <img src="/icon-512.png" alt="Starlr" className="h-12 w-12 rounded-[25%]" />
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              这里是
              <br />
              <span className="bg-gradient-to-r from-brand to-boost bg-clip-text text-transparent">Starlr</span>
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              一次登录，加入 Starlr 的时间线。
              <br />
              发帖、回复、收藏，让每颗星都被看见。
            </p>
          </div>
          <p className="text-xs text-faint">Starlr Forum · Cloudflare Serverless</p>
        </div>

        {/* 表单区 */}
        <div className="bg-canvas p-8 sm:p-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <img src="/icon-512.png" alt="" className="h-9 w-9 rounded-[25%]" />
            <span className="text-xl font-black">Starlr</span>
          </div>
          <h2 className="text-2xl font-extrabold">登录</h2>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">用户名或邮箱</span>
              <div className="relative">
                <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="用户名或邮箱"
                  autoComplete="username"
                  className="pl-10"
                  autoFocus
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">密码</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <Turnstile siteKey={siteKey} onToken={setTurnstileToken} />
            <Button pill size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <LogIn size={17} />} 登录
            </Button>
          </form>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-muted">或</span>
            <div className="h-px flex-1 bg-line" />
          </div>
          <a
            href={githubOAuthStartUrl()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-line py-2.5 text-[14px] font-medium transition hover:bg-surface2"
          >
            <GithubIcon size={17} />
            使用 GitHub 登录
          </a>

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/register" className="font-semibold text-brand hover:underline">
              注册新账号
            </Link>
            <button type="button" onClick={() => setForgotOpen((v) => !v)} className="text-muted hover:text-ink">
              忘记密码？
            </button>
          </div>
          {forgotOpen && (
            <form onSubmit={submitForgot} className="mt-3 flex gap-2">
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="注册邮箱"
                autoComplete="email"
                className="flex-1"
                autoFocus
              />
              <Button type="submit" pill disabled={forgotLoading}>
                {forgotLoading ? <Loader2 size={15} className="animate-spin" /> : null} 发送重置邮件
              </Button>
            </form>
          )}
          <p className="mt-6 text-xs leading-relaxed text-faint">
            登录即代表你同意{' '}
            <Link to="/terms" className="text-brand hover:underline">《用户协议》</Link> 和{' '}
            <Link to="/privacy" className="text-brand hover:underline">《隐私政策》</Link>。
          </p>
        </div>
      </div>
    </div>
  );
}
