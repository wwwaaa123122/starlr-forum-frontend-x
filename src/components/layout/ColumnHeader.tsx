/** 中栏吸顶标题栏：移动端左上角 = 抽屉入口（登录用户显示头像，游客显示菜单）；桌面端 = 返回箭头 + 标题 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar, IconButton } from '@/components/ui/primitives';
import { useMobileDrawer } from './AppShell';
import { cn } from '@/lib/utils';

export function ColumnHeader({
  title,
  subtitle,
  back,
  right,
  tabs,
  showBrandOnMobile = false,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  /** 直接渲染在标题下方的 Tab 行（与其它页面共用一条底边线） */
  tabs?: React.ReactNode;
  /** 移动端首页：右侧显示星标 logo（桌面标题隐藏） */
  showBrandOnMobile?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openDrawer } = useMobileDrawer();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* 左上角：详情页显示返回；其余页面显示抽屉入口（头像/菜单） */}
        {back ? (
          <IconButton label="返回" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft size={20} />
          </IconButton>
        ) : (
          <button
            onClick={openDrawer}
            className="focus-ring -ml-2 shrink-0 rounded-full md:hidden"
            aria-label="打开菜单"
          >
            {user ? (
              <Avatar src={user.avatarUrl} name={user.nickname || user.username} size={32} />
            ) : (
              <span className="btn-icon flex h-8 w-8 items-center justify-center text-ink">
                <Menu size={22} />
              </span>
            )}
          </button>
        )}
        <div className="min-w-0 flex-1">
          {title ? (
            <h1
              className={cn(
                'truncate font-extrabold leading-tight',
                back ? 'text-lg' : 'text-xl',
                showBrandOnMobile && 'hidden md:block',
              )}
            >
              {title}
            </h1>
          ) : (
            <img src="/starlr.svg" alt="Starlr" className="h-7 w-7 md:hidden" />
          )}
          {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
        </div>
        {showBrandOnMobile && <img src="/starlr.svg" alt="Starlr" className="h-7 w-7 md:hidden" />}
        {right}
      </div>
      {tabs && <div className="border-t border-line">{tabs}</div>}
    </header>
  );
}
