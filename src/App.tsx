import { Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { applySeo } from '@/lib/seo';
import { AppShell } from '@/components/layout/AppShell';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminPosts from '@/pages/admin/AdminPosts';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminReports from '@/pages/admin/AdminReports';
import AdminViews from '@/pages/admin/AdminViews';
import AdminNotify from '@/pages/admin/AdminNotify';
import AdminServices from '@/pages/admin/AdminServices';
import AdminSso from '@/pages/admin/AdminSso';
import AdminModerators from '@/pages/admin/AdminModerators';
import AdminAdmins from '@/pages/admin/AdminAdmins';
import AdminAudit from '@/pages/admin/AdminAudit';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui/primitives';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Notifications from '@/pages/Notifications';
import Bookmarks from '@/pages/Bookmarks';
import Profile from '@/pages/Profile';
import PostDetail from '@/pages/PostDetail';
import Compose from '@/pages/Compose';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import OAuthCallback from '@/pages/OAuthCallback';
import Register from '@/pages/Register';
import Settings from '@/pages/Settings';
import Categories from '@/pages/Categories';
import NotFound from '@/pages/NotFound';
import { PrivacyPage, TermsPage } from '@/pages/Legal';

/** 登录守卫 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping } = useAuth();
  const location = useLocation();
  if (bootstrapping) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

/** 路由级 SEO 兜底：每次导航更新 canonical/description（页面可随后用 applySeo 增强） */
function SeoBridge() {
  const location = useLocation();
  useEffect(() => {
    applySeo({ path: `${location.pathname}${location.search}` });
  }, [location.pathname, location.search]);
  return null;
}

/** 各路径的滚动位置记忆（返回 / 前进时恢复，其它导航回顶部） */
const scrollMemory = new Map<string, number>();

/** 页面切换动效：以路径为 key 重新挂载，让新页面播放轻微上浮淡入（anim-page） */
function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="anim-page">
      {children}
    </div>
  );
}

/** 滚动管理：前进/刷新进新页回顶部；浏览器返回/前进（POP）恢复该页上次位置 */
function ScrollManager() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const firstRender = useRef(true);

  // 持续记录当前页滚动位置（离开前保留现场）
  useEffect(() => {
    const onScroll = () => scrollMemory.set(pathname, window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // 首次加载不干预（交给浏览器原生滚动恢复）；之后布局提交前恢复，避免闪跳
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const saved = navType === 'POP' ? scrollMemory.get(pathname) : undefined;
    window.scrollTo(0, saved ?? 0);
  }, [pathname, navType]);

  return null;
}

export default function App() {
  return (
    <AppShell>
      <SeoBridge />
      <ScrollManager />
      <PageTransition>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/bookmarks" element={<RequireAuth><Bookmarks /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/compose" element={<RequireAuth><Compose /></RequireAuth>} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/github/done" element={<OAuthCallback />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="views" element={<AdminViews />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="sso" element={<AdminSso />} />
          <Route path="notify" element={<AdminNotify />} />
          <Route path="moderators" element={<AdminModerators />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      </PageTransition>
    </AppShell>
  );
}
