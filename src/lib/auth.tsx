/** 全局认证状态：Token 管理、401 刷新、未读通知数轮询 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiClientError,
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  jwtExp,
  registerRefreshHandler,
  storeTokens,
} from './api';
import { unreadCount, fetchMe, login as loginApi, register as registerApi, logout as logoutApi, refreshTokens, exchangeOAuth } from './endpoints';
import type { AuthResponse, AuthUserPayload } from './endpoints';
import type { MeUser } from './types';

interface AuthContextValue {
  user: MeUser | null;
  loading: boolean;
  /** 初始会话恢复中（用于避免登录页闪现） */
  bootstrapping: boolean;
  unread: number;
  login: (identifier: string, password: string, turnstileToken?: string) => Promise<AuthUserPayload>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    nickname?: string;
    turnstileToken?: string;
  }) => Promise<AuthUserPayload>;
  logout: () => Promise<void>;
  /** GitHub OAuth 一次性 code 兑换登录态 */
  oauthExchange: (code: string) => Promise<AuthUserPayload>;
  refreshUnread: () => Promise<void>;
  setUser: (user: MeUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let refreshInFlight: Promise<string | null> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(Boolean(getStoredAccessToken()));
  const [unread, setUnread] = useState(0);
  const refreshTimer = useRef<number | null>(null);

  const applyTokens = useCallback((res: AuthResponse) => {
    storeTokens(res.accessToken, res.refreshToken);
  }, []);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    refreshInFlight ??= (async () => {
      let newAccessToken: string | null = null;
      try {
        const res = await refreshTokens(refreshToken);
        applyTokens(res);
        newAccessToken = res.accessToken;
        // retryOn401:false —— 此处处于刷新流程内部，me 请求若 401 再走 refreshHandler 会自我 await 死锁
        const me = await fetchMe({ retryOn401: false });
        setUser(me.user);
        return res.accessToken;
      } catch (err) {
        if (err instanceof ApiClientError) {
          // 服务端明确拒绝（刷新/me 被吊销等）：清登录态
          clearStoredTokens();
          setUser(null);
          return null;
        }
        // 网络错误：token 刷新已成功，保留新 token，交给后续请求重试
        return newAccessToken;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }, [applyTokens]);

  // 注册到 api.ts：401 自动刷新重试
  useEffect(() => {
    registerRefreshHandler(doRefresh);
  }, [doRefresh]);

  // 到期前 10 分钟主动轮换
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    const token = getStoredAccessToken();
    if (!token) return;
    const exp = jwtExp(token);
    if (!exp) return;
    const delay = Math.max(exp * 1000 - Date.now() - 10 * 60 * 1000, 30 * 1000);
    refreshTimer.current = window.setTimeout(() => void doRefresh(), delay);
  }, [doRefresh]);

  // 启动恢复会话
  useEffect(() => {
    const boot = async () => {
      if (!getStoredAccessToken()) {
        setBootstrapping(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me.user);
        scheduleRefresh();
      } catch {
        // 401 已由刷新逻辑处理；其余错误保留 token 下次再试
      } finally {
        setBootstrapping(false);
      }
    };
    void boot();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 未读通知轮询（登录后 60s 一次）
  const refreshUnread = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setUnread(0);
      return;
    }
    try {
      const res = await unreadCount();
      setUnread(res.unread);
    } catch {
      /* 静默 */
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshUnread, user?.id]);

  const login = useCallback(
    async (identifier: string, password: string, turnstileToken?: string) => {
      const res = await loginApi(identifier, password, turnstileToken);
      applyTokens(res);
      const me = await fetchMe().catch(() => null);
      setUser(me?.user ?? (res.user as MeUser));
      scheduleRefresh();
      void refreshUnread();
      return res.user;
    },
    [applyTokens, scheduleRefresh, refreshUnread],
  );

  const oauthExchange = useCallback(
    async (code: string) => {
      const res = await exchangeOAuth(code);
      applyTokens(res);
      const me = await fetchMe().catch(() => null);
      setUser(me?.user ?? (res.user as MeUser));
      scheduleRefresh();
      void refreshUnread();
      return res.user;
    },
    [applyTokens, scheduleRefresh, refreshUnread],
  );

  const register = useCallback(
    async (payload: { username: string; email: string; password: string; nickname?: string; turnstileToken?: string }) => {
      const res = await registerApi(payload);
      applyTokens(res);
      setUser(res.user as MeUser);
      scheduleRefresh();
      void refreshUnread();
      return res.user;
    },
    [applyTokens, scheduleRefresh, refreshUnread],
  );

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    try {
      await logoutApi(refreshToken ?? undefined);
    } catch {
      /* ignore */
    }
    clearStoredTokens();
    setUser(null);
    setUnread(0);
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading: false, bootstrapping, unread, login, register, logout, oauthExchange, refreshUnread, setUser }),
    [user, bootstrapping, unread, login, register, logout, oauthExchange, refreshUnread],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
