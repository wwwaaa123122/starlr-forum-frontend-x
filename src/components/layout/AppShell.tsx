/** 三栏布局壳：左导航（88/275px）+ 中栏 600px + 右栏 350px；移动端底栏 + 抽屉 + FAB */
import { useState } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightRail } from './RightRail';
import { MobileTabBar } from './MobileTabBar';
import { MobileDrawer } from './MobileDrawer';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-[1290px] justify-center">
        {/* 左栏：<768 隐藏；768–1280 仅图标（88px）；≥1280 完整（275px） */}
        <LeftSidebar />

        {/* 中栏：600px + 左右边线；移动端通栏 */}
        <main className="min-h-dvh w-full min-w-0 max-w-[600px] border-line pb-20 md:border-x md:pb-0">
          {children}
        </main>

        {/* 右栏：≥1024 显示 */}
        <RightRail />
      </div>

      {/* 移动端：<768 底部标签栏 + 悬浮发帖钮 */}
      <MobileTabBar onOpenDrawer={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
