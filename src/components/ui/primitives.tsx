/** 轻量 UI 原语（不依赖 Radix，保持 Bundle 精简） */
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { assetUrl } from '@/lib/base-url';

/* ---------------- Button ---------------- */

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm',
  outline: 'border border-line-strong text-ink hover:bg-surface2',
  ghost: 'text-muted hover:bg-surface2 hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
  soft: 'bg-brand-soft text-brand hover:brightness-125',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  pill = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; pill?: boolean }) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center gap-1.5 font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        pill && 'rounded-full',
        !pill && 'rounded-xl',
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- IconButton（圆形图标钮，X 式光晕 hover） ---------------- */

export function IconButton({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label?: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn('btn-icon focus-ring h-9 w-9 text-muted hover:bg-surface2 hover:text-ink active:scale-90', className)}
      {...props}
    />
  );
}

/* ---------------- Input / Textarea ---------------- */

const fieldBase =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-faint outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'resize-none', className)} {...props} />;
}

/* ---------------- Avatar ---------------- */

export function Avatar({
  src,
  name,
  size = 40,
  className,
  onClick,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  const hue = hueFromString(name ?? '');
  return (
    <span
      className={cn(
        // align-top：inline 场景下按行盒顶部对齐，避免基线下延在父级框内留出底部空隙（头像偏移）
        'relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface2 align-top',
        // 尺寸走 CSS 变量，className 里的 h-/w-（含 md: 等变体）可正常覆盖内联尺寸
        'h-(--avatar-size) w-(--avatar-size)',
        className,
      )}
      style={{ '--avatar-size': `${size}px` } as React.CSSProperties}
      onClick={onClick}
    >
      {src && !failed ? (
        <img
          src={assetUrl(src)}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-bold text-white"
          style={{
            fontSize: size * 0.42,
            background: `linear-gradient(135deg, hsl(${hue} 72% 58%), hsl(${(hue + 50) % 360} 70% 46%))`,
          }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}

function hueFromString(key: string): number {
  const hues = [258, 200, 330, 150, 30, 90, 280, 180];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return hues[h % hues.length];
}

/* ---------------- Badge ---------------- */

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line bg-surface2 px-2 py-0.5 text-xs text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Spinner / Skeleton ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand', className)}
      role="status"
      aria-label="加载中"
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface2', className)} />;
}

/* ---------------- Tabs（下划线式，X 风格三 px 底边，指示条平滑滑动） ---------------- */

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}
const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  items: { value: string; label: string; count?: number }[];
  className?: string;
}) {
  const baseId = useId();
  const activeIndex = Math.max(0, items.findIndex((item) => item.value === value));
  const step = items.length > 0 ? 100 / items.length : 100;
  return (
    <TabsContext.Provider value={{ value, setValue: onChange, baseId }}>
      <div className={cn('relative flex overflow-x-auto', className)} role="tablist">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                'focus-ring relative flex-1 whitespace-nowrap px-4 py-3.5 text-[15px] transition hover:bg-surface2',
                active ? 'font-bold text-ink' : 'text-muted',
              )}
            >
              {item.label}
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="ml-1.5 text-xs text-faint">{item.count}</span>
              )}
            </button>
          );
        })}
        {/* 滑动指示条：切换标签时平滑平移到选中项 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 transition-transform duration-200 ease-out"
          style={{ width: `${step}%`, transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-brand" />
        </span>
      </div>
    </TabsContext.Provider>
  );
}

export function useTabsContext() {
  return useContext(TabsContext);
}

/* ---------------- Modal（居中卡片 + 遮罩，进出均有动效） ---------------- */

export function Modal({
  open,
  onClose,
  children,
  className,
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}) {
  /** 关闭时先播 150ms 退场动画再卸载，避免面板生硬消失 */
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 170);
    return () => window.clearTimeout(t);
  }, [open]);

  // 滚动锁定覆盖进出场全程（含退场期间），防止露底闪烁
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center',
        open ? 'anim-fade' : 'anim-fade-out',
      )}
    >
      <div
        className={cn(
          'relative w-full max-w-xl rounded-2xl border border-line bg-canvas shadow-2xl',
          open ? 'anim-panel' : 'anim-panel-out',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
      {closeOnBackdrop && <div className="absolute inset-0 -z-10" onClick={onClose} aria-hidden />}
    </div>
  );
}

/* ---------------- Dropdown（简易菜单） ---------------- */

export function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-52 overflow-hidden rounded-xl border border-line bg-canvas py-1 shadow-2xl',
            align === 'right' ? 'right-0' : 'left-0',
            // 底部弹出的菜单（如左下角账号菜单）自下而上展开，其余自上而下
            className?.includes('bottom-full') ? 'anim-menu-up' : 'anim-menu',
            align === 'right'
              ? className?.includes('bottom-full')
                ? 'origin-bottom-right'
                : 'origin-top-right'
              : className?.includes('bottom-full')
                ? 'origin-bottom-left'
                : 'origin-top-left',
            className,
          )}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  className,
  danger,
  icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; icon?: ReactNode }) {
  return (
    <button
      role="menuitem"
      className={cn(
        'focus-ring flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-surface2 active:bg-surface2',
        danger ? 'text-danger' : 'text-ink',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- EmptyState ---------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <h3 className="text-xl font-extrabold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ---------------- CloseButton（Modal 左上角） ---------------- */

export function ModalClose({ onClose }: { onClose: () => void }) {
  return (
    <IconButton label="关闭" onClick={onClose} className="m-2 hover:bg-surface2">
      <X size={18} />
    </IconButton>
  );
}
