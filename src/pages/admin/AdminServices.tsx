/** 管理后台 · 服务配置：邮件（Resend）/ S3 兼容存储 / GitHub OAuth */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui/primitives';
import { adminErrMsg, Field, Tag } from './shared';
import { api } from '@/lib/api';
import type { MeUser } from '@/lib/types';
import { useAuth } from '@/lib/auth';

interface ServiceFieldView {
  name: string;
  label: string;
  secret: boolean;
  hint: string | null;
  placeholder: string | null;
  value: string | null;
  source: 'kv' | 'env' | null;
}

interface ServiceView {
  key: string;
  label: string;
  description: string;
  testable: boolean;
  configured: boolean;
  fields: ServiceFieldView[];
}

interface ServiceList {
  services: ServiceView[];
}

export default function AdminServices() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => api<ServiceList>('/api/admin/services'),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold">服务配置</h1>
        <Button size="sm" variant="ghost" onClick={() => void q.refetch()}>
          <RefreshCw size={14} /> 刷新
        </Button>
      </div>
      {q.data?.services.map((svc) => (
        <ServiceCard key={svc.key} svc={svc} onSaved={() => void qc.invalidateQueries({ queryKey: ['admin-services'] })} />
      ))}
    </div>
  );
}

function ServiceCard({ svc, onSaved }: { svc: ServiceView; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [testOut, setTestOut] = useState<{ ok: boolean; message: string } | null>(null);
  const [mailTo, setMailTo] = useState('');

  useEffect(() => setDraft({}), [svc.key]);

  const saveMut = useMutation({
    mutationFn: () => api<{ success: true }>(`/api/admin/services/${svc.key}`, { method: 'PUT', body: { values: draft } }),
    onSuccess: () => {
      toast.success(`${svc.label} 已保存`);
      setDraft({});
      onSaved();
    },
    onError: (e) => toast.error(adminErrMsg(e)),
  });

  const resetMut = useMutation({
    mutationFn: () => api<{ success: true }>(`/api/admin/services/${svc.key}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(`${svc.label} 已清空（回退到环境变量配置）`);
      setDraft({});
      onSaved();
    },
    onError: (e) => toast.error(adminErrMsg(e)),
  });

  const testMut = useMutation({
    mutationFn: () => api<{ ok: boolean; message: string }>(`/api/admin/services/${svc.key}/test`, {
      method: 'POST',
      body: svc.key === 'mail' ? { to: mailTo } : {},
    }),
    onSuccess: (res) => setTestOut(res),
    onError: (e) => setTestOut({ ok: false, message: adminErrMsg(e) }),
  });

  const dirty = Object.keys(draft).some((k) => draft[k] !== '');

  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">{svc.label}</h2>
        <Tag tone={svc.configured ? 'ok' : 'warn'}>{svc.configured ? '已配置' : '未配置'}</Tag>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">{svc.description}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {svc.fields.map((f) => (
          <div key={f.name} className={f.name === 'from' || f.name === 'endpoint' || f.name === 'public_base_url' ? 'sm:col-span-2' : ''}>
            <Field label={f.label} hint={f.hint ?? undefined}>
              <div className="flex items-center gap-1.5">
                <Input
                  value={draft[f.name] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                  placeholder={
                    draft[f.name] === undefined && f.value
                      ? f.secret
                        ? `${f.value}（已保存，留空保持不变）`
                        : f.value
                      : (f.placeholder ?? '')
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
                {f.source && (
                  <span className="shrink-0 whitespace-nowrap text-xs text-faint" title={f.source === 'kv' ? '来自管理后台配置' : '来自环境变量兜底'}>
                    {f.source === 'kv' ? '后台' : '环境'}
                  </span>
                )}
              </div>
            </Field>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button pill size="sm" disabled={saveMut.isPending || !dirty} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} 保存
        </Button>
        {svc.testable && (
          <Button pill size="sm" variant="ghost" disabled={testMut.isPending} onClick={() => testMut.mutate()}>
            {testMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />} 测试连通
          </Button>
        )}
        {svc.configured && svc.key !== 'oauth-github' && (
          <Button size="sm" variant="ghost" className="text-red-500" disabled={resetMut.isPending} onClick={() => { if (confirm(`清空「${svc.label}」的后台配置？将回退到环境变量。`)) resetMut.mutate(); }}>
            <Trash2 size={13} /> 清空
          </Button>
        )}
      </div>

      {svc.key === 'mail' && (
        <div className="mt-3">
          <Field label="测试收件邮箱">
            <Input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="you@example.com" type="email" />
          </Field>
        </div>
      )}

      {testOut && (
        <p className={`mt-3 rounded-xl border p-2.5 text-[13px] ${testOut.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'}`}>
          {testOut.ok ? '✓ ' : '✕ '}
          {testOut.message}
        </p>
      )}
    </section>
  );
}
