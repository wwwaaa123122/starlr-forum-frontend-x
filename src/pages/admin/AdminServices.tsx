/** 管理后台 · 服务配置：邮件（Resend）/ S3 兼容存储 / GitHub OAuth */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Skeleton } from '@/components/ui/primitives';
import { ConfirmModal, adminErrMsg, Field, Tag } from './shared';
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

interface MailAccountView {
  from: string;
  source: string;
  api_key_masked: string;
}

interface ServiceView {
  key: string;
  label: string;
  description: string;
  testable: boolean;
  configured: boolean;
  fields: ServiceFieldView[];
  /** 邮件服务专用：账号池（掩码） */
  accounts?: MailAccountView[];
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
  const [mailAccount, setMailAccount] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

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
      body:
        svc.key === 'mail'
          ? { to: mailTo, ...(mailAccount.trim() ? { account: Number(mailAccount) } : {}) }
          : {},
    }),
    onSuccess: (res) => setTestOut(res),
    onError: (e) => setTestOut({ ok: false, message: adminErrMsg(e) }),
  });

  // ---- 邮件账号池编辑（mail 服务专用）----
  const [mailRows, setMailRows] = useState<{ api_key: string; from: string; orig: string }[]>(
    (svc.accounts ?? []).map((a, i) => ({ api_key: '', from: a.from, orig: a.source === 'kv' ? String(i) : 'env' })),
  );
  const mailDirty = mailRows.some((r) => r.api_key !== '' || r.from !== (svc.accounts?.[mailRows.indexOf(r)]?.from ?? ''));

  const saveMailMut = useMutation({
    mutationFn: () =>
      api<{ success: true }>(`/api/admin/services/mail`, {
        method: 'PUT',
        body: {
          accounts: mailRows
            .filter((r) => r.orig !== 'env')
            .map((r, i) => ({ api_key: r.api_key, from: r.from })),
        },
      }),
    onSuccess: () => {
      toast.success('发件账号已保存');
      onSaved();
    },
    onError: (e) => toast.error(adminErrMsg(e)),
  });

  const dirty = Object.keys(draft).some((k) => draft[k] !== '');

  return (
    <section className="rounded-2xl border border-line p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold">{svc.label}</h2>
        <Tag tone={svc.configured ? 'ok' : 'warn'}>{svc.configured ? '已配置' : '未配置'}</Tag>
      </div>

      {svc.key === 'mail' && (
        <div className="space-y-2">
          {mailRows.map((row, i) => {
            const orig = svc.accounts?.[svc.accounts.findIndex((a, j) => (svc.accounts ?? []).filter((x) => x.source === 'kv')[j] === a)]?.source;
            void orig;
            const isEnv = row.orig === 'env';
            return (
              <div key={i} className="rounded-xl border border-line p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">
                    账号 {i + 1}
                    {isEnv && <span className="ml-1.5 rounded bg-surface2 px-1.5 py-0.5 text-faint">环境变量兜底（只读）</span>}
                  </span>
                  {!isEnv && (
                    <button type="button" className="text-xs text-danger hover:underline" onClick={() => setMailRows((rows) => rows.filter((_, j) => j !== i))}>
                      删除
                    </button>
                  )}
                </div>
                {isEnv ? (
                  <p className="text-[13px] text-muted">{row.from} ｜ key：{svc.accounts?.[i]?.api_key_masked}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={row.api_key}
                      onChange={(e) => setMailRows((rows) => rows.map((r, j) => (j === i ? { ...r, api_key: e.target.value } : r)))}
                      placeholder={svc.accounts?.[i]?.api_key_masked ?? 're_...（API Key）'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Input
                      value={row.from}
                      onChange={(e) => setMailRows((rows) => rows.map((r, j) => (j === i ? { ...r, from: e.target.value } : r)))}
                      placeholder="需已在 Resend 验证的发件域"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" className="text-[13px] text-brand hover:underline" onClick={() => setMailRows((rows) => [...rows, { api_key: '', from: '', orig: '' }])}>
            + 添加发件账号
          </button>
          <div className="pt-1">
            <Button pill size="sm" disabled={saveMailMut.isPending} onClick={() => saveMailMut.mutate()}>
              {saveMailMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} 保存账号
            </Button>
          </div>
        </div>
      )}

      {svc.key !== 'mail' && (
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
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {svc.key !== 'mail' && (
        <Button pill size="sm" disabled={saveMut.isPending || !dirty} onClick={() => saveMut.mutate()}>
          {saveMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} 保存
        </Button>
        )}
        {svc.testable && (
          <Button pill size="sm" variant="ghost" disabled={testMut.isPending} onClick={() => testMut.mutate()}>
            {testMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />} 测试连通
          </Button>
        )}
        {svc.configured && svc.key !== 'oauth-github' && svc.key !== 'mail' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            disabled={resetMut.isPending}
            onClick={() => setResetOpen(true)}
          >
            <Trash2 size={13} /> 清空
          </Button>
        )}
      </div>

      {svc.key === 'mail' && (
        <div className="mt-3">
          <Field label="测试收件邮箱">
            <Input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="接收测试邮件的邮箱" type="email" />
          </Field>
          <Field label="测试发件账号（可选）">
            <Input
              value={mailAccount}
              onChange={(e) => setMailAccount(e.target.value.replace(/\D/g, ''))}
              placeholder={`留空 = 自动轮询（共 ${(svc.accounts ?? []).length} 个）`}
              inputMode="numeric"
            />
          </Field>
        </div>
      )}

      {testOut && (
        <p className={`mt-3 rounded-xl border p-2.5 text-[13px] ${testOut.ok ? 'border-boost/30 bg-boost/10 text-boost' : 'border-danger/30 bg-danger/10 text-danger'}`}>
          {testOut.ok ? '✓ ' : '✕ '}
          {testOut.message}
        </p>
      )}

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          setResetOpen(false);
          resetMut.mutate();
        }}
        title={`清空「${svc.label}」的后台配置？`}
        description="将回退到环境变量配置。"
        confirmText="清空"
        danger
      />
    </section>
  );
}
