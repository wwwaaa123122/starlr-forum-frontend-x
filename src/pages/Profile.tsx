/** 用户主页：Banner + 压边头像 + 帖子/回复/喜欢 Tabs */
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Link2, MessageCircle, Pencil, Sparkles, Star, UserX } from 'lucide-react';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { getUser, getUserPosts, getUserReplies, meLikes, userLikes } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { applySeo } from '@/lib/seo';
import { Avatar, Button, EmptyState, Skeleton, Tabs } from '@/components/ui/primitives';
import { PostCard } from '@/components/post/PostCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { ReplyCard } from '@/components/post/ReplyCard';
import { assetUrl } from '@/lib/base-url';
import { cn, displayName, formatCount, joinedMonth } from '@/lib/utils';

export default function Profile() {
  const { username = '' } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [tab, setTab] = useState('posts');
  const isMe = me?.username.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    setTab('posts');
  }, [username]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user', username],
    queryFn: () => getUser(username),
  });
  const profile = data?.user;

  useEffect(() => {
    applySeo({
      title: profile ? `${displayName(profile.nickname || profile.username)} (@${profile.username}) - 星辰旅人论坛` : '星辰旅人论坛',
      description: profile?.bio ?? undefined,
      path: profile ? `/u/${encodeURIComponent(profile.username)}` : undefined,
    });
  }, [profile]);

  const postsQuery = useInfiniteQuery({
    queryKey: ['user-posts', username],
    queryFn: ({ pageParam }) => getUserPosts(username, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(profile) && tab === 'posts',
  });
  const repliesQuery = useInfiniteQuery({
    queryKey: ['user-replies', username],
    queryFn: ({ pageParam }) => getUserReplies(username, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(profile) && tab === 'replies',
  });
  const likesVisible = Boolean(isMe) || Boolean(profile?.likesPublic);
  const likesQuery = useInfiniteQuery({
    queryKey: ['likes', username],
    queryFn: ({ pageParam }) => (isMe ? meLikes(pageParam, 20) : userLikes(username, pageParam, 20)),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(profile) && likesVisible && tab === 'likes',
  });

  const posts = useMemo(() => postsQuery.data?.pages.flatMap((p) => p.posts) ?? [], [postsQuery.data]);
  const replies = useMemo(() => repliesQuery.data?.pages.flatMap((p) => p.replies) ?? [], [repliesQuery.data]);
  const likedPosts = useMemo(() => likesQuery.data?.pages.flatMap((p) => p.posts) ?? [], [likesQuery.data]);

  if (isLoading) {
    return (
      <>
        <ColumnHeader back />
        <Skeleton className="h-[160px] w-full rounded-none md:h-[200px]" />
        <div className="flex items-end justify-between px-4">
          <Skeleton className="-mt-10 h-24 w-24 rounded-full border-4 border-canvas md:-mt-14 md:h-[124px] md:w-[124px]" />
          <Skeleton className="mb-2 h-9 w-28 rounded-full" />
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <PostSkeleton />
      </>
    );
  }

  if (isError || !profile) {
    return (
      <>
        <ColumnHeader back />
        <EmptyState
          icon={<UserX size={44} strokeWidth={1.2} />}
          title="这位星旅者不存在"
          description="用户名可能有误，或账号已注销"
          action={
            <Button pill onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </>
    );
  }

  if (profile.banned) {
    return (
      <>
        <ColumnHeader back />
        <EmptyState icon={<UserX size={44} strokeWidth={1.2} />} title="该用户已被封禁" />
      </>
    );
  }

  const name = displayName(profile.nickname || profile.username);
  const tabs = [
    { value: 'posts', label: '帖子', count: profile.postCount },
    { value: 'replies', label: '回复', count: profile.replyCount },
    ...(likesVisible ? [{ value: 'likes', label: '喜欢' }] : []),
  ];

  return (
    <>
      <ColumnHeader back title={name} subtitle={`${formatCount(profile.postCount)} 帖子`} />

      {/* Banner：自定义背景图（未设置时用星云渐变占位） */}
      <div className="relative h-[150px] bg-surface2 md:h-[200px]">
        {profile.backgroundUrl ? (
          <img
            src={assetUrl(profile.backgroundUrl)}
            alt={`${name} 的主页背景`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--sl-brand-soft),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(58,210,159,0.12),transparent_50%)]" />
            <div className="absolute inset-0 flex items-center justify-center opacity-40">
              <img src="/icon-512.png" alt="" className="h-12 w-12 rounded-[25%] md:h-16 md:w-16" />
            </div>
          </>
        )}
      </div>

      {/* 头像压边 + 操作按钮 */}
      <div className="flex items-end justify-between px-4">
        <div className={cn('-mt-12 rounded-full border-4 border-canvas md:-mt-[70px]')}>
          <Avatar src={profile.avatarUrl} name={name} size={96} className="md:h-[124px] md:w-[124px]" />
        </div>
        <div className="mt-3 flex gap-2">
          {isMe ? (
            <Button variant="outline" pill onClick={() => navigate('/settings')}>
              <Pencil size={15} /> 编辑资料
            </Button>
          ) : (
            <Button variant="outline" pill onClick={() => navigate(`/explore?q=${profile.username}`)}>
              查看动态
            </Button>
          )}
        </div>
      </div>

      {/* 资料信息 */}
      <div className="px-4 pb-1 pt-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          {name}
          {profile.role === 'admin' && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
              <Star size={11} className="fill-current" /> 站长
            </span>
          )}
          {profile.role === 'moderator' && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-boost">
              <Sparkles size={11} /> 版主
            </span>
          )}
        </h1>
        <p className="text-[15px] text-muted">
          @{profile.username}
          {profile.uid != null && <span className="ml-1 text-faint">· UID {profile.uid}</span>}
        </p>
        {profile.bio && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{profile.bio}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={15} /> {joinedMonth(profile.createdAt)} 加入
          </span>
          {/^https?:\/\//.test(profile.bio) && (
            <a
              href={profile.bio}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 size={15} /> {profile.bio.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          )}
        </div>
        <div className="mt-2.5 flex gap-5 text-sm">
          <span>
            <b className="font-bold">{formatCount(profile.postCount)}</b>{' '}
            <span className="text-muted">帖子</span>
          </span>
          <span>
            <b className="font-bold">{formatCount(profile.replyCount)}</b>{' '}
            <span className="text-muted">回复</span>
          </span>
        </div>
      </div>

      <div className="mt-3 border-y border-line">
        <Tabs value={tab} onChange={setTab} items={tabs} />
      </div>

      {/* Tab 内容 */}
      {tab === 'posts' &&
        (postsQuery.isLoading ? (
          <><PostSkeleton /><PostSkeleton /></>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Star size={44} strokeWidth={1.2} />}
            title={isMe ? '你还没有发帖' : '还没有帖子'}
            description={isMe ? '把第一缕星光分享给大家吧' : undefined}
          />
        ) : (
          <>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} showCategory={false} />
            ))}
            {postsQuery.hasNextPage && (
              <LoadMore onClick={() => void postsQuery.fetchNextPage()} loading={postsQuery.isFetchingNextPage} />
            )}
          </>
        ))}

      {tab === 'replies' &&
        (repliesQuery.isLoading ? (
          <><PostSkeleton /><PostSkeleton /></>
        ) : replies.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={44} strokeWidth={1.2} />}
            title={isMe ? '你还没有回复' : '还没有回复'}
          />
        ) : (
          <>
            {replies.map((r) => (
              <ReplyCard key={r.id} reply={r} showPostTitle />
            ))}
            {repliesQuery.hasNextPage && (
              <LoadMore onClick={() => void repliesQuery.fetchNextPage()} loading={repliesQuery.isFetchingNextPage} />
            )}
          </>
        ))}

      {tab === 'likes' && likesVisible &&
        (likesQuery.isLoading ? (
          <><PostSkeleton /><PostSkeleton /></>
        ) : likedPosts.length === 0 ? (
          <EmptyState
            icon={<Star size={44} strokeWidth={1.2} />}
            title="还没有点赞"
            description="为喜欢的帖子点亮星星吧"
            action={
              <Link to="/">
                <Button pill>去逛逛</Button>
              </Link>
            }
          />
        ) : (
          <>
            {likedPosts.map((p) => (
              <PostCard key={p.id} post={p} liked />
            ))}
            {likesQuery.hasNextPage && (
              <LoadMore onClick={() => void likesQuery.fetchNextPage()} loading={likesQuery.isFetchingNextPage} />
            )}
          </>
        ))}
    </>
  );
}

function LoadMore({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      className="block w-full py-4 text-center text-sm font-semibold text-brand transition hover:bg-surface2"
    >
      {loading ? '加载中…' : '加载更多'}
    </button>
  );
}
