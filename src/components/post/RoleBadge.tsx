/** 角色徽章：站长仅 uid 1；其他 admin→管理员；moderator→版主（三端统一规则） */
import { Star, Sparkles } from 'lucide-react';

export function RoleBadge({ role, uid }: { role?: string | null; uid?: number | null }) {
  if (!role) return null;
  if (role === 'admin') {
    const owner = uid === 1;
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-brand">
        <Star size={10} className="fill-current" /> {owner ? '站长' : '管理员'}
      </span>
    );
  }
  if (role === 'moderator') {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-boost">
        <Sparkles size={10} /> 版主
      </span>
    );
  }
  return null;
}
