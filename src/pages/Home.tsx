/** 首页：信息流 + 双 Tab（最新/热门）+ 桌面内联发帖器 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Hash, Sparkles, X } from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { listPosts } from '@/lib/endpoints';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { Composer } from '@/components/post/Composer';
import { ComposerModal } from '@/components/post/ComposerModal';
import { Button, EmptyState, Tabs } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'new' | 'hot'>('new');
  const [modalOpen, setModalOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const category = searchParams.get('category') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;

  useEffect(() => {
    document.title = 'Starlr · 星辰旅人';
  }, []);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts', tab, category ?? '', tag ?? ''],
    queryFn: ({ pageParam }) => listPosts({ page: pageParam, sort: tab, category, tag, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);
  const filterLabel = category ?? (tag ? `#${tag}` : null);

  return (
    <>
      <ColumnHeader
        title={filterLabel ? (category ? '星域' : '标签') : '首页'}
        showBrandOnMobile={!filterLabel}
        tabs={
          filterLabel ? undefined : (
            <Tabs
              value={tab}
              onChange={(v) => setTab(v as 'new' | 'hot')}
              items={[
                { value: 'new', label: '最新' },
                { value: 'hot', label: '热门' },
              ]}
            />
          )
        }
      />

      {/* 过滤条 */}
      {filterLabel && (
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
          <span className="flex items-center gap-1.5 truncate text-sm font-bold text-brand">
            {category ? <Hash size={14} /> : <Sparkles size={14} className="text-star" />}
            {filterLabel}
          </span>
          <Link to="/" className="flex items-center gap-1 rounded-full bg-surface2 px-2.5 py-1 text-xs font-semibold text-muted transition hover:text-ink">
            <X size={12} /> 清除
          </Link>
        </div>
      )}

      {/* 桌面内联发帖器 */}
      {user && !filterLabel && (
        <div className="hidden border-b border-line md:block">
          <Composer mode="post" compact />
        </div>
      )}

      {/* 信息流 */}
      {isLoading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : isError ? (
        <EmptyState
          title="星光暂时黯淡"
          description={error instanceof Error ? error.message : '加载失败，请稍后重试'}
          action={
            <Button pill onClick={() => void queryClient.refetchQueries()}>
              重新加载
            </Button>
          }
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={44} strokeWidth={1.2} />}
          title={filterLabel ? '这里还没有星迹' : '还没有帖子'}
          description={filterLabel ? '换个星域看看，或发布第一帖点亮它' : '发布第一帖，点亮这片星海'}
          action={
            user ? (
              <Button pill onClick={() => setModalOpen(true)}>
                发帖
              </Button>
            ) : (
              <Link to="/login">
                <Button pill>登录后发帖</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && <PostSkeleton />}
          {!hasNextPage && posts.length > 6 && (
            <p className="py-8 text-center text-sm text-faint">已经到底啦 · 愿星光与你同在 ✦</p>
          )}
        </>
      )}

      <ComposerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
