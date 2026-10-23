/** AppShell：三栏布局 + 抽屉状态 Context（中栏左上角头像/菜单按钮触发） */
import { createContext, useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LeftSidebar } from './LeftSidebar';
import { RightRail, PageFooter } from './RightRail';
import { MobileTabBar } from './MobileTabBar';
import { MobileDrawer } from './MobileDrawer';
import { cn } from '@/lib/utils';

interface MobileDrawerContextValue {
  openDrawer: () => void;
}

const MobileDrawerContext = createContext<MobileDrawerContextValue>({ openDrawer: () => {} });

/** 中栏头部（ColumnHeader）等处唤起移动端抽屉 */
export function useMobileDrawer(): MobileDrawerContextValue {
  return useContext(MobileDrawerContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <MobileDrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <div className="min-h-dvh bg-canvas text-ink">
        <div className="mx-auto flex w-full max-w-[1290px] justify-center">
          {/* 左栏：管理后台隐藏；<768 隐藏；768–1280 仅图标（64px）；≥1280 完整（235px） */}
          {!isAdmin && <LeftSidebar />}

          {/* 中栏：600px + 左右边线；移动端通栏；管理后台加宽 */}
          <main
            className={cn(
              'min-h-dvh w-full min-w-0 border-line pb-20 md:border-x md:pb-0',
              isAdmin ? 'max-w-[1100px]' : 'max-w-[600px]',
            )}
          >
            {children}
          </main>

          {/* 右栏：仅首页（≥1024）显示 */}
          {isHome && <RightRail />}
        </div>

        {/* 全宽页脚：非首页显示（首页右栏已有自己的页脚） */}
        {!isHome && <PageFooter />}

        {/* 移动端：<768 底部标签栏 + 悬浮发帖钮；抽屉由中栏左上角触发 */}
        <MobileTabBar />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </MobileDrawerContext.Provider>
  );
}
