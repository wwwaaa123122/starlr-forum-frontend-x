/**
 * Cloudflare Turnstile 人机验证组件。
 * 按需加载官方脚本，显式渲染到容器内；site key 未配置时自动隐藏（本地开发）。
 * 主题跟随 Starlr 的 data-theme（dark/light）。
 */
import { useEffect, useRef, useState } from 'react';
import { API_BASE } from '@/lib/base-url';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

let scriptLoading = false;

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    window.onTurnstileLoad = () => resolve();
    if (!scriptLoading) {
      scriptLoading = true;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
      script.async = true;
      script.onerror = () => {
        scriptLoading = false;
        reject(new Error('Turnstile 加载失败'));
      };
      document.head.appendChild(script);
    }
  });
}

interface TurnstileProps {
  siteKey: string | null;
  onToken: (token: string) => void;
}

export function Turnstile({ siteKey, onToken }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        setVisible(true);
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => onToken(''),
        });
      })
      .catch(() => {
        /* 脚本加载失败：不阻塞表单，后端会再次校验 */
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className={visible ? 'flex justify-center py-1' : 'hidden'}>
      <div ref={containerRef} />
    </div>
  );
}

/** 获取站点配置（/api/config，含 Turnstile site key），模块级缓存 */
let configCache: { turnstileSiteKey: string | null } | null = null;

export async function fetchSiteConfig(): Promise<{ turnstileSiteKey: string | null }> {
  if (configCache) return configCache;
  try {
    const res = await fetch(`${API_BASE}/api/config`);
    configCache = (await res.json()) as { turnstileSiteKey: string | null };
  } catch {
    configCache = { turnstileSiteKey: null };
  }
  return configCache;
}
