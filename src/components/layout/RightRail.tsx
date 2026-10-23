/** 右栏（≥1024，仅首页）：搜索框、热门板块、页脚；RailFooter 供其它页面单独渲染页脚 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Hash, Flame } from 'lucide-react';
import { hotPosts, listCategories, searchUsers } from '@/lib/endpoints';
import { formatCount , displayName } from '@/lib/utils';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { useSiteConfig } from '@/lib/useSiteConfig';

/** 右栏页脚（非首页页面也单独渲染） */
export function RailFooter() {
  const cfg = useSiteConfig();
  return (
    <footer className="hidden px-4 py-4 text-[13px] leading-5 text-faint lg:block">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Link to="/terms" className="hover:underline">用户协议</Link>
        <Link to="/privacy" className="hover:underline">隐私政策</Link>
        <Link to="/privacy" className="hover:underline">Cookie</Link>
        <a href="https://github.com/wwwaaa123122" target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>
      </div>
      <div className="mt-1">© 2025-2026 {cfg?.siteName ?? 'Forum'} · GPL-3.0 开源协议</div>
    </footer>
  );
}

export function RightRail({ hidden }: { hidden?: boolean }) {
  const cfg = useSiteConfig();
  if (hidden) return null;
  return (
    <aside className="sticky top-0 hidden h-dvh w-[350px] shrink-0 flex-col gap-4 overflow-y-auto px-5 py-2 pb-8 lg:flex">
      <SearchBox />
      <HotPostsCard />
      <CategoriesCard />
      <Footer />
    </aside>
  );
}

/** 页脚（首页右栏内） */
function Footer() {
  const cfg = useSiteConfig();
  return (
    <footer className="px-3 text-[13px] leading-5 text-faint">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Link to="/terms" className="hover:underline">用户协议</Link>
        <Link to="/privacy" className="hover:underline">隐私政策</Link>
        <Link to="/privacy" className="hover:underline">Cookie</Link>
      </div>
      <div>© 2025-2026 {cfg?.siteName ?? 'Forum'} · GPL-3.0</div>
      <div className="mt-0.5">
        <a href="https://github.com/wwwaaa123122" target="_blank" rel="noreferrer" className="text-xs text-muted hover:underline">GitHub</a>
      </div>
    </footer>
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

/** 热门帖卡（后端 /api/posts?sort=hot，热度 = 点赞×3 + 回复×2 + 浏览/10，按活跃度加权衰减） */
function HotPostsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['hot-posts-rail'],
    queryFn: () => hotPosts({ page: 1, pageSize: 6 }),
  });
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-2 px-4 pb-2 pt-3 text-lg font-extrabold">
        <Flame size={17} className="text-star" />
        热门
      </h2>
      {isLoading ? (
        <div className="space-y-3 px-4 pb-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <div>
          {(data?.posts ?? []).slice(0, 6).map((p) => (
            <Link
              key={p.id}
              to={`/post/${p.id}`}
              className="block px-4 py-2.5 transition hover:bg-surface2"
            >
              <div className="truncate text-[15px] font-bold text-ink">{p.title}</div>
              <div className="text-[13px] text-muted">
                {displayName(p.authorNickname || p.authorName)} · {formatCount(p.likeCount)} 赞 · {formatCount(p.replyCount)} 回复
              </div>
            </Link>
          ))}
          {(!data || data.posts.length === 0) && (
            <p className="px-4 pb-4 text-sm text-muted">暂无热门帖子</p>
          )}
          <Link
            to="/explore?sort=hot"
            className="block px-4 py-3 text-[15px] text-brand transition hover:brightness-110"
          >
            查看更多
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
