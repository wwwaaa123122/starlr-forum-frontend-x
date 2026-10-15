/** 移动端侧滑抽屉：账号区 + 导航 + 主题切换 + 登出 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Moon, Settings, Sun, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toggleTheme, useTheme } from '@/lib/theme';
import { Avatar } from '@/components/ui/primitives';
import { drawerNavItems } from './LeftSidebar';
import { cn } from '@/lib/utils';

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, unread, logout } = useAuth();
  const navigate = useNavigate();
  /** 关闭时先播侧滑退场动画再卸载 */
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  // 滚动锁定覆盖进出场全程（含退场期间）
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  // Hook 必须无条件调用：放在提前 return 之前，否则打开抽屉瞬间会因
  // 「Rendered more hooks than during the previous render」崩溃黑屏
  const isDark = useTheme() === 'dark';

  if (!mounted) return null;

  const items = drawerNavItems(user, unread);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-brand/10 backdrop-blur-sm ${open ? 'anim-fade' : 'anim-fade-out'}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`absolute inset-y-0 left-0 flex w-[78%] max-w-[320px] flex-col border-r border-line bg-canvas p-5 shadow-2xl ${
          open ? 'anim-drawer' : 'anim-drawer-out'
        }`}
      >
        {/* 账号区 */}
        {user ? (
          <Link to={`/u/${user.username}`} onClick={onClose} className="mb-6 flex items-center gap-3">
            <Avatar src={user.avatarUrl} name={user.nickname || user.username} size={48} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-lg font-extrabold">{user.nickname || user.username}</span>
              <span className="block truncate text-sm text-muted">@{user.username}</span>
            </span>
          </Link>
        ) : (
          <div className="mb-6 flex items-center gap-2.5">
            <button
              onClick={() => go('/login')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand py-2.5 text-[15px] font-bold text-white transition hover:bg-brand-hover"
            >
              <LogIn size={16} /> 登录
            </button>
            <button
              onClick={() => go('/register')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line-strong py-2.5 text-[15px] font-bold text-ink transition hover:bg-surface2"
            >
              <UserPlus size={16} /> 注册
            </button>
          </div>
        )}

        {/* 导航（逐项错峰滑入） */}
        <nav className="flex flex-col">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => go(item.to)}
                style={{ animationDelay: `${i * 30}ms` }}
                className="anim-item flex items-center gap-4 rounded-full px-3 py-3 text-left text-lg transition hover:bg-surface2 active:bg-surface2"
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={1.9} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                {item.label}
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => go('/settings')}
              style={{ animationDelay: `${items.length * 30}ms` }}
              className="anim-item flex items-center gap-4 rounded-full px-3 py-3 text-left text-lg transition hover:bg-surface2 active:bg-surface2"
            >
              <Settings size={22} strokeWidth={1.9} /> 设置
            </button>
          )}
        </nav>

        {/* 底部：主题 + 登出 */}
        <div
          className="anim-item mt-auto flex flex-col gap-1 border-t border-line pt-4"
          style={{ animationDelay: `${(items.length + 1) * 30}ms` }}
        >
          <button
            onClick={() => toggleTheme()}
            className="flex items-center gap-4 rounded-full px-3 py-3 text-left text-lg transition hover:bg-surface2"
          >
            {isDark ? <Moon size={22} strokeWidth={1.9} /> : <Sun size={22} strokeWidth={1.9} />}
            {isDark ? '暗色主题' : '亮色主题'}
          </button>
          {user && (
            <button
              onClick={() => {
                onClose();
                void logout();
                navigate('/');
              }}
              className={cn(
                'flex items-center gap-4 rounded-full px-3 py-3 text-left text-lg transition hover:bg-surface2',
                'text-danger',
              )}
            >
              <LogOut size={22} strokeWidth={1.9} /> 退出登录
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
