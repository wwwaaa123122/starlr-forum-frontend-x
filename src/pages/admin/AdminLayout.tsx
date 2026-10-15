/** 管理后台布局：权限守卫 + X 风格分区标签（URL 驱动） */
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

interface Section {
  to: string;
  label: string;
  adminOnly?: boolean;
  end?: boolean;
}

const SECTIONS: Section[] = [
  { to: '/admin', label: '概览', end: true },
  { to: '/admin/users', label: '用户', adminOnly: true },
  { to: '/admin/posts', label: '帖子' },
  { to: '/admin/categories', label: '板块' },
  { to: '/admin/reports', label: '举报' },
  { to: '/admin/views', label: '浏览统计' },
  { to: '/admin/services', label: '服务配置', adminOnly: true },
  { to: '/admin/sso', label: 'SSO 同步', adminOnly: true },
  { to: '/admin/notify', label: '通知', adminOnly: true },
  { to: '/admin/moderators', label: '版主', adminOnly: true },
  { to: '/admin/admins', label: '管理员', adminOnly: true },
  { to: '/admin/audit', label: '审计日志', adminOnly: true },
];

export default function AdminLayout() {
  const { user, bootstrapping } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isStaff = isAdmin || user?.role === 'moderator';

  if (bootstrapping) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isStaff) {
    return (
      <>
        <ColumnHeader title="管理后台" back />
        <EmptyState icon={<ShieldCheck size={40} />} title="无权访问" description="只有管理员和版主可以进入后台" />
      </>
    );
  }

  // adminOnly 分区（/admin/users、/admin/services 等）仅管理员可访问：直接输 URL 也要拦下
  const current = SECTIONS.find((s) =>
    s.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(s.to),
  );
  if (current?.adminOnly && !isAdmin) {
    return (
      <>
        <ColumnHeader title="管理后台" back />
        <EmptyState icon={<ShieldCheck size={40} />} title="无权访问" description="该分区仅管理员可以访问" />
      </>
    );
  }

  const items = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <>
      <ColumnHeader
        title="管理后台"
        right={
          <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
            <ShieldCheck size={13} />
            {isAdmin ? '管理员' : '版主'}
          </span>
        }
        tabs={
          <nav className="flex overflow-x-auto" role="tablist">
          {items.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.to === '/admin'}
              role="tab"
              className={({ isActive }) =>
                cn(
                  'relative whitespace-nowrap px-4 py-3.5 text-[15px] transition hover:bg-surface2',
                  isActive ? 'font-bold text-ink' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {s.label}
                  {isActive && (
                    <span className="anim-tab absolute inset-x-3 bottom-0 h-1 rounded-full bg-brand" aria-hidden />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        }
      />
      <div className="p-4 pb-24 sm:p-5 md:pb-8">
        <Outlet />
      </div>
    </>
  );
}
