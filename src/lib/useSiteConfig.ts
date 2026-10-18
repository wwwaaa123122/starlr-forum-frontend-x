import { useEffect, useState } from 'react';
import { getConfig, type SiteConfig } from './endpoints';

/**
 * 站点配置（/api/config）全局缓存：站点名等品牌信息从后端读取，
 * 自部署者在管理后台改站点名后前端无需改代码。
 */
let cache: SiteConfig | null = null;
let inflight: Promise<SiteConfig> | null = null;
const listeners = new Set<(c: SiteConfig) => void>();

async function load(): Promise<SiteConfig> {
  if (cache) return cache;
  if (!inflight) {
    inflight = getConfig()
      .then((c) => {
        cache = c;
        listeners.forEach((l) => l(c));
        return c;
      })
      .catch(() => {
        inflight = null;
        // 兜底：后端不可达也不至于白屏
        return {
          siteName: 'Forum',
          turnstileSiteKey: null,
          registrationEnabled: true,
        } as SiteConfig;
      });
  }
  return inflight;
}

export function useSiteConfig(): SiteConfig | null {
  const [cfg, setCfg] = useState<SiteConfig | null>(cache);
  useEffect(() => {
    if (!cache) void load();
    listeners.add(setCfg);
    return () => {
      listeners.delete(setCfg);
    };
  }, []);
  return cfg;
}

/** 页面标题工具：`${page} - ${siteName}`，站点名未加载时先只用 page */
export function siteTitle(cfg: SiteConfig | null, page?: string): string {
  const name = cfg?.siteName || '';
  if (!page) return name || '';
  return name && name !== page ? `${page} - ${name}` : page;
}

/** 站点默认名（加载前的静态兜底，仅用于首帧） */
export const FALLBACK_SITE_NAME = 'Forum';
