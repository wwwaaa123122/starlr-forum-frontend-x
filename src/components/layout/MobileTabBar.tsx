/** 移动端底部标签栏（<768px）+ 悬浮发帖 FAB；抽屉入口在中栏左上角（见 ColumnHeader） */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, Compass, Home, PenLine, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function MobileTabBar() {
  const { user, unread } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = [
    { to: '/', label: '首页', icon: Home },
    { to: '/explore', label: '探索', icon: Compass },
    { to: '/notifications', label: '通知', icon: Bell, badge: unread },
    { to: '/bookmarks', label: '书签', icon: Bookmark },
    user
      ? { to: `/u/${user.username}`, label: '我的', icon: UserIcon }
      : { to: '/login', label: '登录', icon: UserIcon },
  ];

  return (
    <>
      {/* 悬浮发帖按钮 */}
      {user && (
        <button
          onClick={() => navigate('/compose')}
          aria-label="发帖"
          className="focus-ring fixed bottom-[76px] right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95 md:hidden"
        >
          <PenLine size={24} />
        </button>
      )}

      {/* 底部标签栏 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch justify-around border-t border-line bg-canvas/90 pb-safe backdrop-blur-lg md:hidden">
        {items.map((item) => {
          const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={cn(
                'btn-icon focus-ring relative m-auto h-12 w-16',
                active ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icon size={25} strokeWidth={active ? 2.4 : 1.9} />
              {item.badge != null && item.badge > 0 && (
                <span className="absolute right-2 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
