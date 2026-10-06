/**
 * 主题状态：React 感知的单一事实来源。
 *
 * 之前的问题是组件在渲染时直接读 `document.documentElement.dataset.theme`，
 * 切换主题不会触发重渲染，图标/文案要等下一次路由变化才更新。
 * 现在用 useSyncExternalStore 订阅：setTheme() 立即通知所有订阅组件。
 */
import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'starlr.theme';
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 从 localStorage 读取记忆的主题（默认暗色） */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** 当前生效的主题（DOM 上的 dataset） */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** 把主题写到 DOM（html data-theme + 浏览器地址栏 theme-color） */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
}

/** 初始化：应用 localStorage 记忆（main.tsx 启动时调用一次） */
export function initTheme(): void {
  applyTheme(readStoredTheme());
}

/** 设置主题并通知订阅组件 */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  emit();
}

/** 明暗切换 */
export function toggleTheme(): void {
  setTheme(currentTheme() === 'light' ? 'dark' : 'light');
}

/** React Hook：主题变化时组件立即重渲染 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark' as Theme);
}
