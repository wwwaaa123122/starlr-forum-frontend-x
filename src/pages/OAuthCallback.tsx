import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

/** /oauth/github/done?code=... — GitHub 回跳中转：code 换 token 后进首页 */
export default function OAuthCallback() {
  const { oauthExchange } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    if (!code) {
      setError('缺少授权码，请回到登录页重新操作');
      return;
    }
    void (async () => {
      try {
        await oauthExchange(code);
        navigate('/', { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : '登录失败，请重试');
      }
    })();
  }, [params, oauthExchange, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-lg font-semibold">GitHub 登录未完成</h1>
        <p className="max-w-sm text-sm text-muted">{error}</p>
        <a href="/login" className="text-sm text-brand underline-offset-4 hover:underline">
          返回登录
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin text-brand" size={28} />
      <p className="text-sm text-muted">正在完成 GitHub 登录…</p>
    </div>
  );
}
