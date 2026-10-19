/** 站点信息设置（admin）：站点名/标语/描述/页脚 + 初始化开关（注册/邮箱/S3） */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { Button, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SitePayload {
  site: {
    site_name: string;
    site_tagline: string;
    site_description: string;
    site_footer: string;
  };
}
interface SetupPayload {
  setup: {
    registration_enabled: boolean;
    registration_email_required: boolean;
    uploads_storage: 'r2' | 's3';
  };
}

const field =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand';

export default function AdminSite() {
  const [site, setSite] = useState<SitePayload['site'] | null>(null);
  const [setup, setSetup] = useState<SetupPayload['setup'] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [s1, s2] = await Promise.all([
        api<SitePayload>('/api/admin/services/site').catch(() => null),
        api<SetupPayload>('/api/admin/services/setup').catch(() => null),
      ]);
      if (s1) setSite(s1.site);
      if (s2) setSetup(s2.setup);
    })();
  }, []);

  if (!site) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const saveSite = async () => {
    setSaving(true);
    try {
      const r = await api<SitePayload>('/api/admin/services/site', {
        method: 'PATCH',
        body: JSON.stringify({
          site_name: site.site_name,
          site_tagline: site.site_tagline || undefined,
          site_description: site.site_description || undefined,
          site_footer: site.site_footer || undefined,
        }),
      });
      setSite(r.site);
      toast.success('站点信息已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const saveSetup = async (patch: Partial<SetupPayload['setup']>) => {
    const next = { ...setup!, ...patch };
    setSetup(next);
    try {
      const r = await api<SetupPayload>('/api/admin/services/setup', {
        method: 'PATCH',
        body: JSON.stringify({
          registration_enabled: next.registration_enabled,
          registration_email_required: next.registration_email_required,
          uploads_storage: next.uploads_storage,
        }),
      });
      setSetup(r.setup);
    } catch {
      toast.error('保存失败');
    }
  };

  return (
    <>
      <ColumnHeader title="站点设置" />
      <div className="space-y-6 p-4 pb-24">
        <section className="rounded-xl border border-line p-4 space-y-3">
          <h2 className="text-sm font-bold">站点信息</h2>
          <label className="block space-y-1">
            <span className="text-xs text-muted">站点名称（浏览器标题、登录页、页脚等）</span>
            <input className={field} value={site.site_name} maxLength={60}
              onChange={(e) => setSite({ ...site, site_name: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">标语（可选）</span>
            <input className={field} value={site.site_tagline ?? ''} maxLength={120}
              onChange={(e) => setSite({ ...site, site_tagline: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">站点描述（可选，SEO 用）</span>
            <textarea className={`${field} min-h-20`} value={site.site_description ?? ''} maxLength={300}
              onChange={(e) => setSite({ ...site, site_description: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">页脚文案（可选）</span>
            <input className={field} value={site.site_footer ?? ''} maxLength={120}
              onChange={(e) => setSite({ ...site, site_footer: e.target.value })} />
          </label>
          <Button onClick={saveSite} disabled={saving || !site.site_name.trim()}>
            {saving ? '保存中…' : '保存站点信息'}
          </Button>
        </section>

        {setup && (
          <section className="rounded-xl border border-line p-4 space-y-3">
            <h2 className="text-sm font-bold">初始化选项</h2>
            <label className="flex items-center justify-between gap-4">
            <span className="text-sm">开放注册</span>
            <Switch
              checked={setup.registration_enabled}
              onChange={(v) => void saveSetup({ registration_enabled: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm">
              注册需要邮箱
              <span className="block text-xs text-muted">关闭后用户仅用用户名+密码即可注册</span>
            </span>
            <Switch
              checked={setup.registration_email_required}
              onChange={(v) => void saveSetup({ registration_email_required: v })}
            />
          </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm">
                图片上传到 S3
                <span className="block text-xs text-muted">关闭时头像/图片走 R2 或 KV；开启需先在服务配置中填 S3 凭据</span>
              </span>
              <select
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                value={setup.uploads_storage}
                onChange={(e) => void saveSetup({ uploads_storage: e.target.value as 'r2' | 's3' })}
              >
                <option value="r2">R2 / KV</option>
                <option value="s3">S3</option>
              </select>
            </label>
          </section>
        )}
      </div>
    </>
  );
}

/** 与设置页一致的开关样式 */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line-strong')}
    >
      <span
        className={cn(
          'absolute top-0.5 size-6 rounded-full bg-white shadow transition-all',
          checked ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}
