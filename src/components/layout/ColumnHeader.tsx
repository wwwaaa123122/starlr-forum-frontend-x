/** 中栏吸顶标题栏：返回箭头 + 标题/副标题 + 右侧插槽（移动端首页显示头像 + 星标 logo） */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar, IconButton } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function ColumnHeader({
  title,
  subtitle,
  back,
  right,
  tabs,
  showBrandOnMobile = false,
  onOpenDrawer,
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  /** 直接渲染在标题下方的 Tab 行（与其它页面共用一条底边线） */
  tabs?: React.ReactNode;
  showBrandOnMobile?: boolean;
  onOpenDrawer?: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-4">
        {back && (
          <IconButton label="返回" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft size={20} />
          </IconButton>
        )}
        {showBrandOnMobile && (
          <button
            onClick={onOpenDrawer}
            className="focus-ring -ml-2 shrink-0 rounded-full md:hidden"
            aria-label="打开菜单"
          >
            <Avatar src={user?.avatarUrl} name={user?.nickname || user?.username || '游客'} size={32} />
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
        {showBrandOnMobile && (
          <img src="/starlr.svg" alt="Starlr" className="h-7 w-7 md:hidden" />
        )}
        {right}
      </div>
      {tabs && <div className="border-t border-line">{tabs}</div>}
    </header>
  );
}
