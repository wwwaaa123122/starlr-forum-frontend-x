/** 重置密码：邮件链接携带一次性 token（30 分钟有效），设置新密码 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetPassword } from '@/lib/endpoints';
import { Button, Input } from '@/components/ui/primitives';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return toast.error('重置链接无效，请重新申请');
    if (password !== confirm) return toast.error('两次输入的新密码不一致');
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success('密码已重置，请用新密码登录');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-canvas p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <img src="/icon-512.png" alt="" className="h-9 w-9 rounded-[25%]" />
          <span className="text-xl font-black">重置密码</span>
        </div>
        {!token ? (
          <>
            <p className="text-sm leading-relaxed text-muted">重置链接无效或已过期，请返回登录页重新申请找回密码。</p>
            <Button pill className="mt-4 w-full" onClick={() => navigate('/login')}>
              返回登录
            </Button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">新密码</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 位以上"
                autoComplete="new-password"
                required
                minLength={8}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-muted">确认新密码</span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="8 位以上"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <Button pill size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} 重置密码
            </Button>
            <p className="text-center text-xs text-faint">
              想起密码了？<Link to="/login" className="text-brand hover:underline">返回登录</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
