/** 登录页：左右分栏品牌区（桌面） + 表单（移动单栏） */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Loader2, LogIn, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui/primitives';
import { Turnstile, fetchSiteConfig } from '@/components/Turnstile';

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
          <img src="/starlr.svg" alt="Starlr" className="h-12 w-12" />
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
            <img src="/starlr.svg" alt="" className="h-9 w-9" />
            <span className="text-xl font-black">Starlr</span>
          </div>
          <h2 className="text-2xl font-extrabold">登录</h2>
          <p className="mt-1 text-sm text-muted">欢迎回到星海</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">用户名或邮箱</span>
              <div className="relative">
                <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="starlighter"
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

          <div className="mt-5 flex items-center justify-between text-sm">
            <Link to="/register" className="font-semibold text-brand hover:underline">
              注册新账号
            </Link>
            <Link to="/login" className="text-muted hover:text-ink" title="找回密码（使用注册邮箱）">
              忘记密码？
            </Link>
          </div>
          <p className="mt-6 flex items-start gap-1.5 text-xs leading-relaxed text-faint">
            <Star size={12} className="mt-0.5 shrink-0 text-star" />
            登录即代表同意社区守则：友善交流、尊重版权、不发布违法违规内容。
          </p>
        </div>
      </div>
    </div>
  );
}
