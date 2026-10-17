/** 右栏（≥1024）：搜索框、热门标签「正在闪耀」、板块分类、页脚 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Hash, Sparkles } from 'lucide-react';
import { hotTags, listCategories, searchUsers } from '@/lib/endpoints';
import { formatCount , displayName } from '@/lib/utils';
import { Avatar, Skeleton } from '@/components/ui/primitives';

export function RightRail({ hidden }: { hidden?: boolean }) {
  if (hidden) return null;
  return (
    <aside className="sticky top-0 hidden h-dvh w-[350px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-2 pb-8 lg:flex">
      <SearchBox />
      <TrendsCard />
      <CategoriesCard />
      <footer className="px-3 text-[13px] leading-5 text-faint">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link to="/terms" className="hover:underline">用户协议</Link>
          <Link to="/privacy" className="hover:underline">隐私政策</Link>
          <Link to="/privacy" className="hover:underline">Cookie</Link>
        </div>
        <div className="mt-1">© 2025 Starlr Forum</div>
      </footer>
    </aside>
  );
}

/** 圆角搜索框（聚焦变亮描边，X 式） */
export function SearchBox() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form
      className="sticky top-0 z-10 -mx-1 bg-canvas/90 px-1 py-1 backdrop-blur"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
      }}
      role="search"
    >
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索 Starlr"
          className="focus-ring h-11 w-full rounded-full border border-transparent bg-surface pl-12 pr-4 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:bg-canvas"
        />
      </div>
    </form>
  );
}

/** 热门标签卡（后端 /api/posts/tags） */
function TrendsCard() {
  const { data, isLoading } = useQuery({ queryKey: ['hot-tags'], queryFn: hotTags });
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-2 px-4 pb-2 pt-3 text-lg font-extrabold">
        <Sparkles size={17} className="text-star" />
        正在闪耀
      </h2>
      {isLoading ? (
        <div className="space-y-3 px-4 pb-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <div>
          {(data?.tags ?? []).slice(0, 6).map((tag) => (
            <Link
              key={tag.name}
              to={`/explore?tag=${encodeURIComponent(tag.name)}`}
              className="block px-4 py-2.5 transition hover:bg-surface2"
            >
              <div className="text-[13px] text-faint">标签</div>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">#{tag.name}</span>
                <span className="text-[13px] text-muted">{formatCount(tag.count)} 帖</span>
              </div>
            </Link>
          ))}
          {(!data || data.tags.length === 0) && (
            <p className="px-4 pb-4 text-sm text-muted">还没有标签被点亮</p>
          )}
          <Link
            to="/explore"
            className="block px-4 py-3 text-[15px] text-brand transition hover:brightness-110"
          >
            探索更多
          </Link>
        </div>
      )}
    </section>
  );
}

/** 板块分类卡 */
function CategoriesCard() {
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="px-4 pb-2 pt-3 text-lg font-extrabold">板块</h2>
      {isLoading ? (
        <div className="space-y-3 px-4 pb-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <div className="pb-2">
          {(data?.categories ?? []).slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              to={`/explore?category=${cat.slug}`}
              className="flex items-center justify-between px-4 py-2.5 transition hover:bg-surface2"
            >
              <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                <Hash size={16} className="text-brand" />
                {cat.name}
              </span>
              <span className="text-[13px] text-muted">{formatCount(cat.postCount)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** 用户即时搜索结果（500ms debounce，探索页与右栏共用） */
export function UserSearchResults({ q, limit = 5 }: { q: string; limit?: number }) {
  const [debounced, setDebounced] = useState(q);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebounced(q.trim()), 400);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  const { data, isLoading } = useQuery({
    queryKey: ['user-search', debounced],
    queryFn: () => searchUsers(debounced),
    enabled: debounced.length >= 1,
  });

  if (!debounced) return null;
  const users = (data?.users ?? []).slice(0, limit);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h3 className="px-4 pb-1 pt-3 text-lg font-extrabold">星旅者</h3>
      {isLoading ? (
        <div className="space-y-3 px-4 pb-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : users.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">没有找到相关用户</p>
      ) : (
        users.map((u) => (
          <Link
            key={u.username}
            to={`/u/${u.username}`}
            className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-surface2"
          >
            <Avatar src={u.avatarUrl} name={displayName(u.nickname || u.username)} size={40} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-bold">{displayName(u.nickname || u.username)}</span>
              <span className="block truncate text-sm text-muted">@{u.username}</span>
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
