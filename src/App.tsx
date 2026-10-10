import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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

export default function App() {
  return (
    <AppShell>
      <SeoBridge />
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
    </AppShell>
  );
}
