/** 左侧导航栏：图标栏（768–1280）→ 完整栏（≥1280），含发帖按钮与账号芯片 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Compass,
  Hash,
  Home,
  LogOut,
  Moon,
  PenLine,
  Settings,
  User as UserIcon,
  MoreHorizontal,
  Sun,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Avatar, Button, Dropdown, MenuItem } from '@/components/ui/primitives';
import { applyTheme } from '@/main';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number }>;
  badge?: number;
  requireAuth?: boolean;
}

export function LeftSidebar() {
  const { user, unread, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items: NavItem[] = [
    { to: '/', label: '首页', icon: Home },
    { to: '/explore', label: '探索', icon: Compass },
    { to: '/notifications', label: '通知', icon: Bell, badge: unread, requireAuth: true },
    { to: '/bookmarks', label: '书签', icon: Bookmark, requireAuth: true },
    { to: '/categories', label: '板块', icon: Hash },
    ...(user ? [{ to: `/u/${user.username}`, label: '我的主页', icon: UserIcon }] : []),
  ];

  const isDark = document.documentElement.dataset.theme !== 'light';

  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('starlr.theme', next);
    } catch {
      /* ignore */
    }
    applyTheme();
  };

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col justify-between px-1 py-2 md:flex md:w-[88px] xl:w-[275px]">
      <div className="flex flex-col items-center xl:items-start">
        {/* Logo */}
        <Link
          to="/"
          className="btn-icon focus-ring my-0.5 h-13 w-13 p-3 hover:bg-surface2"
          aria-label="Starlr 首页"
        >
          <img src="/icon-512.png" alt="Starlr" className="h-8 w-8 rounded-[25%]" />
        </Link>

        {/* 导航项 */}
        <nav className="mt-1 flex w-full flex-col items-center gap-0.5 xl:items-start">
          {items.map((item) => {
            const active =
              item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={cn(
                  'btn-icon focus-ring group relative h-13 max-w-fit gap-4 px-3 py-2.5 hover:bg-surface2',
                  active ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                <span className="relative">
                  <Icon size={26} strokeWidth={active ? 2.4 : 1.9} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className={cn('hidden text-xl xl:inline', active && 'font-bold')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 发帖按钮（仅登录用户） */}
        {user && (
          <div className="mt-3 w-full px-1 xl:px-2">
            <Button
              pill
              size="lg"
              className="h-13 w-full max-w-[52px] text-lg xl:max-w-none"
              onClick={() => navigate('/compose')}
              aria-label="发帖"
            >
              <span className="hidden xl:inline">发帖</span>
              <PenLine size={22} className="xl:hidden" />
            </Button>
          </div>
        )}
      </div>

      {/* 底部账号芯片 / 主题切换 */}
      <div className="flex flex-col items-center gap-1 px-1 xl:items-stretch xl:px-2">
        <button
          onClick={toggleTheme}
          title={isDark ? '切换到亮色' : '切换到暗色'}
          className="btn-icon focus-ring h-12 w-12 shrink-0 text-muted hover:bg-surface2 hover:text-ink xl:h-11 xl:w-full xl:justify-start xl:gap-3 xl:px-3"
        >
          {isDark ? <Moon size={22} /> : <Sun size={22} />}
          <span className="hidden text-[15px] xl:inline">{isDark ? '暗色' : '亮色'}</span>
        </button>

        {user ? (
          <Dropdown
            align="left"
            className="bottom-full mb-2"
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="focus-ring flex w-full items-center gap-2.5 rounded-full p-2 transition hover:bg-surface2 xl:px-3"
              >
                <Avatar src={user.avatarUrl} name={user.nickname || user.username} size={40} />
                <span className="hidden min-w-0 flex-1 flex-col items-start leading-tight xl:flex">
                  <span className="max-w-[120px] truncate text-[15px] font-bold">
                    {user.nickname || user.username}
                  </span>
                  <span className="max-w-[120px] truncate text-sm text-muted">@{user.username}</span>
                </span>
                <MoreHorizontal size={18} className="hidden shrink-0 text-muted xl:block" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem
                  icon={<UserIcon size={17} />}
                  onClick={() => {
                    close();
                    navigate(`/u/${user.username}`);
                  }}
                >
                  我的主页
                </MenuItem>
                <MenuItem
                  icon={<Settings size={17} />}
                  onClick={() => {
                    close();
                    navigate('/settings');
                  }}
                >
                  设置
                </MenuItem>
                <MenuItem
                  danger
                  icon={<LogOut size={17} />}
                  onClick={() => {
                    close();
                    void logout();
                    navigate('/');
                  }}
                >
                  退出登录
                </MenuItem>
              </>
            )}
          </Dropdown>
        ) : (
          <Button
            pill
            size="lg"
            variant="primary"
            className="h-13 w-full max-w-[52px] text-lg xl:max-w-none"
            onClick={() => navigate('/login')}
            aria-label="登录"
          >
            <span className="hidden xl:inline">登录 / 注册</span>
            <LogIn size={22} className="xl:hidden" />
          </Button>
        )}
      </div>
    </aside>
  );
}

/** 移动端抽屉里复用的导航列表 */
export function drawerNavItems(user: { username: string } | null, unread: number): NavItem[] {
  const items: NavItem[] = [
    { to: '/', label: '首页', icon: Home },
    { to: '/explore', label: '探索', icon: Compass },
    { to: '/notifications', label: '通知', icon: Bell, badge: unread, requireAuth: true },
    { to: '/bookmarks', label: '书签', icon: Bookmark, requireAuth: true },
    { to: '/categories', label: '板块', icon: Hash },
  ];
  if (user) items.push({ to: `/u/${user.username}`, label: '我的主页', icon: UserIcon });
  else items.push({ to: '/login', label: '登录', icon: LogIn }, { to: '/register', label: '注册', icon: UserPlus });
  return items;
}
