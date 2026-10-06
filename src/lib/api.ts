/** 统一 API 客户端：Bearer 注入、401 单飞刷新重试、统一错误解析 */

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

type RefreshHandler = () => Promise<string | null>;

let refreshHandler: RefreshHandler | null = null;

/** 由 AuthProvider 注册：401 时尝试刷新 Token，返回新 Access Token 或 null */
export function registerRefreshHandler(handler: RefreshHandler) {
  refreshHandler = handler;
}

const NO_RETRY_CODES = new Set(['TOKEN_REPLAY', 'INVALID_TOKEN']);

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** 401 时是否尝试刷新后重试（默认 true） */
  retryOn401?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, retryOn401 = true } = options;

  const doFetch = async (accessToken: string | undefined) => {
    const headers: Record<string, string> = {};
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    return fetch(path, {
      method,
      headers,
      body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  let accessToken = getStoredAccessToken() ?? undefined;
  let res = await doFetch(accessToken);

  if (res.status === 401 && retryOn401 && refreshHandler) {
    let code = '';
    try {
      const errBody = (await res.clone().json()) as ApiErrorBody;
      code = errBody?.error?.code ?? '';
    } catch {
      /* ignore */
    }
    if (!NO_RETRY_CODES.has(code)) {
      const newToken = await refreshHandler();
      if (newToken) {
        accessToken = newToken;
        res = await doFetch(accessToken);
      }
    }
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errBody = data as ApiErrorBody | null;
    throw new ApiClientError(
      res.status,
      errBody?.error?.code ?? 'UNKNOWN',
      errBody?.error?.message ?? `请求失败（${res.status}）`,
      errBody?.error?.details,
    );
  }
  return data as T;
}

/* ---------------- Token 本地持久化 ---------------- */

const ACCESS_KEY = 'starlr.access';
const REFRESH_KEY = 'starlr.refresh';

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(access: string, refresh: string) {
  try {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage 不可用时静默降级为内存态 */
  }
}

export function clearStoredTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

/** 解析 JWT exp（不验证签名，仅用于到期前主动刷新） */
export function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}
