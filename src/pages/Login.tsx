/** 登录页：左右分栏品牌区（桌面） + 表单（移动单栏） */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Loader2, LogIn, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui/primitives';
import { Turnstile, fetchSiteConfig } from '@/components/Turnstile';
import { githubOAuthStartUrl } from '@/lib/endpoints';

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

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
              一次登录，加入星辰旅人的时间线。
              <br />
              发帖、回复、收藏，让每颗星都被看见。
            </p>
          </div>
          <p className="text-xs text-faint">星辰旅人论坛 · Cloudflare Serverless</p>
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
            <Link to="/login" className="text-muted hover:text-ink" title="找回密码（使用注册邮箱）">
              忘记密码？
            </Link>
          </div>
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
