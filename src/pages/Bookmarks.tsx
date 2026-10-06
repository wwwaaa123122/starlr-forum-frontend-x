/** 书签页：我收藏的帖子（/api/me/favorites） */
import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { meFavorites } from '@/lib/endpoints';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { EmptyState } from '@/components/ui/primitives';

export default function Bookmarks() {
  useEffect(() => {
    document.title = '书签 - Starlr Forum';
  }, []);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['me-favorites'],
    queryFn: ({ pageParam }) => meFavorites(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
  });

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  return (
    <>
      <ColumnHeader title="书签" back subtitle="你收藏的星迹" />
      {isLoading ? (
        <><PostSkeleton /><PostSkeleton /><PostSkeleton /></>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={44} strokeWidth={1.2} />}
          title="还没有书签"
          description="点帖子下方的收藏按钮，把值得回味的星迹留在这里"
        />
      ) : (
        <>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} favorited />
          ))}
          {hasNextPage && (
            <button
              onClick={() => void fetchNextPage()}
              className="block w-full py-4 text-center text-sm font-semibold text-brand transition hover:bg-surface2"
            >
              {isFetchingNextPage ? '加载中…' : '加载更多'}
            </button>
          )}
        </>
      )}
    </>
  );
}
