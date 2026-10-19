/** 探索页：搜索（帖子/用户）+ 热门标签 + 分类导航 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Hash, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { hotTags, listCategories, search } from '@/lib/endpoints';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { Avatar, EmptyState, Skeleton, Tabs } from '@/components/ui/primitives';
import { formatCount , displayName } from '@/lib/utils';
import { useSiteConfig, siteTitle } from '@/lib/useSiteConfig';

export default function Explore() {
  const cfg = useSiteConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('type') === 'user' ? 'user' : 'post') as 'post' | 'user';
  const [input, setInput] = useState(searchParams.get('q') ?? '');
  const category = searchParams.get('category') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;
  const q = searchParams.get('q') ?? '';

  /* 输入框跟随 URL（从标签/分类链接进入时同步 q） */
  useEffect(() => {
    setInput(q);
  }, [q]);

  const setTab = (v: 'post' | 'user') => {
    const next = new URLSearchParams(searchParams);
    if (v === 'user') next.set('type', 'user');
    else next.delete('type');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    document.title = siteTitle(cfg, '探索');
  }, []);

  const submit = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['search', q, tab, category ?? '', tag ?? ''],
    queryFn: ({ pageParam }) =>
      search({ q, type: tab, category, tag, page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(q || category || tag),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '500px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts ?? []) ?? [], [data]);
  const users = useMemo(() => data?.pages.flatMap((p) => p.users ?? []) ?? [], [data]);
  const searching = Boolean(q || category || tag);
  const filterLabel = category ?? (tag ? `#${tag}` : null);

  const { data: tagsData } = useQuery({ queryKey: ['hot-tags'], queryFn: hotTags });
  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  return (
    <>
      <ColumnHeader
        title="探索"
        tabs={
          searching ? (
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as 'post' | 'user')}
              items={[
                { value: 'post', label: '帖子' },
                { value: 'user', label: '用户' },
              ]}
            />
          ) : undefined
        }
      />

      {/* 搜索框（吸顶） */}
      <div className="sticky top-14 z-20 border-b border-line bg-canvas/90 p-3 backdrop-blur">
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} role="search">
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="搜索帖子、用户、#标签"
              className="focus-ring h-10 w-full rounded-full border border-transparent bg-surface pl-10 pr-9 text-[15px] outline-none focus:border-brand focus:bg-canvas"
            />
            {input && (
              <button
                type="button"
                onClick={() => { setInput(''); submit(''); }}
                aria-label="清空"
                className="btn-icon absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {!searching ? (
        /* 发现页：热门标签 + 板块 */
        <div className="px-4 py-4">
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <TrendingUp size={18} className="text-star" /> 热门标签
            </h2>
            <div className="flex flex-wrap gap-2">
              {(tagsData?.tags ?? []).map((t) => (
                <Link
                  key={t.name}
                  to={`/explore?tag=${encodeURIComponent(t.name)}`}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold transition hover:border-brand hover:text-brand"
                >
                  #{t.name}
                  <span className="text-xs font-normal text-faint">{formatCount(t.count)}</span>
                </Link>
              ))}
              {(!tagsData || tagsData.tags.length === 0) && (
                <p className="text-sm text-muted">暂无热门标签</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
              <Sparkles size={18} className="text-brand" /> 板块
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(catsData?.categories ?? []).map((c) => (
                <Link
                  key={c.id}
                  to={`/explore?category=${c.slug}`}
                  className="rounded-2xl border border-line bg-surface p-4 transition hover:border-brand/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold">
                      <Hash size={15} className="text-brand" />
                      {c.name}
                    </span>
                    <span className="text-xs text-muted">{formatCount(c.postCount)} 帖</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-muted">{c.description || '自由交流的板块'}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : tab === 'post' ? (
        <>
          {filterLabel && (
            <div className="border-b border-line bg-surface px-4 py-2 text-sm font-bold text-brand">
              {category ? `板块：${category}` : `标签：${filterLabel}`}
            </div>
          )}
          {isLoading ? (
            <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<Search size={44} strokeWidth={1.2} />}
              title="没有找到相关帖子"
              description="换个关键词试试，或浏览热门标签与板块"
            />
          ) : (
            <>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
              <div ref={sentinelRef} className="h-4" />
              {isFetchingNextPage && <PostSkeleton />}
            </>
          )}
        </>
      ) : (
        /* 用户搜索结果 */
        <div className="p-3">
          {!q ? (
            <p className="px-2 py-6 text-center text-sm text-muted">输入用户名或昵称开始搜索</p>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState icon={<Search size={44} strokeWidth={1.2} />} title="没有找到相关用户" />
          ) : (
            users.map((u) => (
              <Link
                key={u.username}
                to={`/u/${u.username}`}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-surface2"
              >
                <Avatar src={u.avatarUrl} name={displayName(u.nickname || u.username)} size={44} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[15px] font-bold">{displayName(u.nickname || u.username)}</span>
                  <span className="block truncate text-sm text-muted">@{u.username}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </>
  );
}
