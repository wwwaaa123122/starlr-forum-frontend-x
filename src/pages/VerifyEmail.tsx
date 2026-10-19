/** 邮箱激活页：/verify-email?token=xxx（一次性令牌，24 小时有效） */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button, Spinner } from '@/components/ui/primitives';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '正在验证你的邮箱…' : '链接无效：缺少验证令牌');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api('/api/auth/verify-email', { method: 'POST', body: { token } });
        if (cancelled) return;
        setState('ok');
        setMessage('邮箱验证成功，账号已激活！');
        // 刷新本地用户态（emailVerified / accountStatus）
        try {
          const me = await api<{ user: never }>('/api/auth/me');
          setUser(me.user);
        } catch { /* 未登录则忽略 */ }
      } catch (e) {
        if (cancelled) return;
        setState('error');
        setMessage(e instanceof Error ? e.message : '验证失败，链接可能已过期');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, setUser]);

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface2 p-8 text-center">
        <div className="mb-2 flex justify-center">
          {state === 'ok' ? (
            <CheckCircle2 className="size-12 text-boost" />
          ) : state === 'loading' ? (
            <Spinner className="size-10" />
          ) : (
            <XCircle className="size-12 text-destructive" />
          )}
        </div>
        <h1 className="text-lg font-extrabold">
          {state === 'ok' ? '激活成功' : state === 'loading' ? '验证中' : '激活失败'}
        </h1>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <div className="mt-5 flex flex-col gap-2">
          {state === 'ok' ? (
            <Button onClick={() => navigate('/compose')}>去发布第一篇帖子 →</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate('/settings')}>
                到设置页重新发送验证邮件
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                返回首页
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 未验证账号横幅（站内提示 + 重发按钮） */
export function UnverifiedBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);
  if (!user || user.accountStatus !== 'unverified') return null;

  const resend = async () => {
    setSending(true);
    try {
      const res = await api<{ sent: boolean; alreadyVerified?: boolean; cooldown?: number }>(
        '/api/auth/resend-verification',
        { method: 'POST' },
      );
      if (res.alreadyVerified) toast.success('账号已验证');
      else {
        toast.success('验证邮件已发送，请查收');
        setCooldown(res.cooldown ?? 60);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败，请稍后再试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-line bg-brand-soft text-brand">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <span>
          <strong>邮箱未验证</strong>：你可以浏览内容，但发帖、回复与上传需要先激活账号。
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={sending || cooldown > 0}
          onClick={() => void resend()}
        >
          {sending ? '发送中…' : cooldown > 0 ? `重新发送（${cooldown}s）` : '重新发送验证邮件'}
        </Button>
      </div>
    </div>
  );
}
