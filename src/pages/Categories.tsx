/** 板块（分类）列表页：卡片网格 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Hash, Lock } from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { listCategories } from '@/lib/endpoints';
import { Skeleton, EmptyState } from '@/components/ui/primitives';
import { formatCount } from '@/lib/utils';
import { useSiteConfig, siteTitle } from '@/lib/useSiteConfig';

const CATEGORY_ICONS: Record<string, string> = {
  talk: '💬',
  tech: '🛠️',
  art: '🎨',
  life: '🌱',
  question: '❓',
  share: '✨',
};

export default function Categories() {
  const cfg = useSiteConfig();
  useEffect(() => {
    document.title = siteTitle(cfg, '板块');
  }, []);
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  return (
    <>
      <ColumnHeader title="板块" back subtitle="按话题划分的讨论区" />
      {isLoading ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (data?.categories ?? []).length === 0 ? (
        <EmptyState title="暂无板块" />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {data!.categories.map((c) => (
            <Link
              key={c.id}
              to={`/explore?category=${c.slug}`}
              className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/60 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-extrabold">
                  <span className="text-xl">{CATEGORY_ICONS[c.icon] ?? <Hash size={18} className="text-brand" />}</span>
                  {c.name}
                </span>
                {c.postPolicy === 'staff' ? (
                  <span className="flex items-center gap-1 text-xs text-star">
                    <Lock size={12} /> 仅版主
                  </span>
                ) : (
                  <span className="text-xs text-muted">{formatCount(c.postCount)} 帖</span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted">
                {c.description || '自由交流的板块'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
