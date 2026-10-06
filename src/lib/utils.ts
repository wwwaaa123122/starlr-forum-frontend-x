import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 数字缩写：1.2K / 3.4M（X 风格） */
export function formatCount(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) {
    const k = v / 1000;
    return `${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}K`;
  }
  const m = v / 1_000_000;
  return `${m >= 100 ? Math.round(m) : Math.round(m * 10) / 10}M`;
}

/** 相对时间：刚刚 / 3 分钟前 / 昨天 / 3月12日 / 2024年3月12日 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '昨天';
  if (day < 7) return `${day} 天前`;
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  if (sameYear) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 加入时间：2024年3月 */
export function joinedMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/** 精确时间：2024年3月12日 14:30 */
export function fullTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso.endsWith('Z') || iso.includes('T') ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 头像 URL（后端返回相对路径 /api/avatars/:uid?v=...，同源直接使用） */
export function avatarUrl(url: string | null | undefined): string {
  return url ?? '';
}

/** 生成基于字符串的稳定颜色（无头像时的首字母底色） */
const AVATAR_HUES = [258, 200, 330, 150, 30, 90, 280, 180];
export function hueOf(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

/** 展示名：昵称优先，回退用户名 */
export function displayName(name: string | null | undefined): string {
  return (name ?? '').trim() || '星旅者';
}

/** 去除 Markdown 语法得到纯文本摘要（信息流卡片用） */
export function stripMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  const flat = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]{1,3}/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat;
}

/** 把帖子正文首行/摘要截断为一行预览 */
export function excerptOf(text: string | null | undefined, max = 180): string {
  if (!text) return '';
  const flat = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/#{1,6}\s*/g, '').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** 归一化标签数组（后端两种形态：string[] / {name}[]） */
export function tagsOf(tags: string[] | { name: string }[] | undefined | null): string[] {
  if (!tags?.length) return [];
  return tags.map((t) => (typeof t === 'string' ? t : t.name));
}
