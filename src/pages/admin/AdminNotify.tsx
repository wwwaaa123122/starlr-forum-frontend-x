/** 系统通知：群发全部用户或按 UID 定向发送 */
import { useState } from 'react';
import { Send, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button, Input, Textarea } from '@/components/ui/primitives';

export default function AdminNotify() {
  const [mode, setMode] = useState<'all' | 'uid'>('all');
  const [uid, setUid] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const target: 'all' | number = mode === 'all' ? 'all' : Number(uid);
    if (mode === 'uid' && (!uid || !Number.isInteger(target as number) || (target as number) <= 0)) {
      toast.error('请输入有效的 UID');
      return;
    }
    setSending(true);
    try {
      const res = await api<{ created: number }>('/api/admin/notifications', {
        method: 'POST',
        body: { title: title.trim(), body: body.trim(), link: link.trim(), target },
      });
      toast.success(`通知已发送给 ${res.created} 位用户`);
      setTitle('');
      setBody('');
      setLink('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div>
        <h3 className="text-[15px] font-extrabold">发送系统通知</h3>
        <p className="mt-0.5 text-xs text-muted">
          通知会出现在用户的通知中心（系统通知）。可群发全部用户，或按 UID 定向发送。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={mode === 'all' ? 'primary' : 'outline'} size="sm" pill onClick={() => setMode('all')}>
          <Users className="size-4" /> 全部用户
        </Button>
        <Button variant={mode === 'uid' ? 'primary' : 'outline'} size="sm" pill onClick={() => setMode('uid')}>
          <User className="size-4" /> 指定 UID
        </Button>
        {mode === 'uid' && (
          <Input
            value={uid}
            onChange={(e) => setUid(e.target.value.replace(/\D/g, ''))}
            placeholder="用户 UID"
            className="h-9 w-32"
            inputMode="numeric"
          />
        )}
      </div>

      <div className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="通知标题" maxLength={100} />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="通知正文（可选）" maxLength={500} rows={3} />
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="跳转链接（可选）：/post/xxx 或 https://…" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">发送频率限制：每小时 10 次</span>
        <Button pill onClick={() => void send()} disabled={sending || !title.trim()}>
          <Send className="size-4" /> {sending ? '发送中…' : '发送通知'}
        </Button>
      </div>
    </div>
  );
}
