/**
 * 前端动态 SEO meta：Google/Bing 渲染 JS 可直接受益；
 * 百度等不渲染 JS 的爬虫由 Worker 端动态渲染兜底（backend/src/routes/seo.ts）。
 * canonical 一律归并到主域，避免 x / forum / f 三域重复内容。
 */
/**
 * canonical 主域：默认跟随当前访问域名（自部署无需改代码）；
 * 需要 SEO 收录归并时在管理后台「SEO 服务」配置 canonical_host（Worker 端渲染与 sitemap 用）。
 */
export const CANONICAL_HOST = location.hostname;
const CANON = `${location.origin}`;
const DEFAULT_DESC = '一个轻量、现代的社区论坛。';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoInput {
  title?: string;
  description?: string;
  /** 相对路径（默认当前 pathname+search） */
  path?: string;
  noindex?: boolean;
  ogType?: 'website' | 'article';
  image?: string | null;
}

/** 更新 document head 的 SEO 标签（幂等） */
export function applySeo(input: SeoInput = {}) {
  const path = input.path ?? `${location.pathname}${location.search}`;
  const canonical = `${CANON}${path === '/' ? '/' : path.replace(/\/+$/, '')}`;
  const desc = (input.description ?? DEFAULT_DESC).slice(0, 160);

  if (input.title) document.title = input.title;
  upsertMeta('name', 'description', desc);
  upsertMeta('name', 'robots', input.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  upsertLink('canonical', canonical);
  upsertMeta('property', 'og:site_name', document.title.split(' - ').pop() || 'Forum');
  upsertMeta('property', 'og:type', input.ogType ?? 'website');
  upsertMeta('property', 'og:title', input.title ?? document.title);
  upsertMeta('property', 'og:description', desc);
  upsertMeta('property', 'og:url', canonical);
  upsertMeta('property', 'og:locale', 'zh_CN');
  upsertMeta('name', 'twitter:card', 'summary');
  if (input.image) upsertMeta('property', 'og:image', input.image);
}

/** 页面级使用：数据加载后增强 meta（title/description 等） */
export function useSeo(input: SeoInput, deps: unknown[] = []) {
  // 独立实现避免引 react 依赖循环：由调用方在 useEffect 中调用 applySeo
  void input;
  void deps;
}
