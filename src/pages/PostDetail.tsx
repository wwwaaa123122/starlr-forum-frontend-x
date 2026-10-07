/** 帖子详情：正文 Markdown + 操作条 + 楼中楼回复 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { CornerDownRight, Bookmark, Eye, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  favoritePost,
  getPost,
  likePost,
  listReplies,
  markView,
  unfavoritePost,
  unlikePost,
} from '@/lib/endpoints';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { useAuth } from '@/lib/auth';
import { applySeo } from '@/lib/seo';
import { ActionButton } from '@/components/post/PostCard';
import { Composer } from '@/components/post/Composer';
import { ReplyCard } from '@/components/post/ReplyCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { Avatar, Button, EmptyState, Skeleton } from '@/components/ui/primitives';
import { RichText } from '@/lib/markdown';
import { displayName, formatCount, fullTime, tagsOf } from '@/lib/utils';
import type { Reply } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function PostDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const viewedRef = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
  });

  const { data: repliesData, isLoading: repliesLoading } = useQuery({
    queryKey: ['replies', id],
    queryFn: () => listReplies(id, 1, 50),
    enabled: Boolean(data),
  });

  // 浏览量上报（每次进入去重一次）
  useEffect(() => {
    if (!id || viewedRef.current) return;
    viewedRef.current = true;
    void markView(id)
      .then((res) => {
        if (typeof res?.viewCount === 'number') {
          queryClient.setQueryData<{ post: { viewCount: number } }>(['post', id], (old) =>
            old ? { ...old, post: { ...old.post, viewCount: res.viewCount! } } : old,
          );
        }
      })
      .catch(() => undefined);
  }, [id, queryClient]);

  const post = data?.post;

  /* 详情页互动（乐观更新 + 回写缓存） */
  const [likeState, setLikeState] = useState<{ liked: boolean; count: number } | null>(null);
  const [favState, setFavState] = useState<{ favorited: boolean; count: number } | null>(null);
  const effectiveLike = likeState ?? (post ? { liked: post.liked, count: post.likeCount } : null);
  const effectiveFav = favState ?? (post ? { favorited: post.favorited, count: post.favoriteCount } : null);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) return navigate('/login');
      if (!post) return;
      if (effectiveLike?.liked) await unlikePost(post.id);
      else await likePost(post.id);
    },
    onMutate: () =>
      setLikeState((s) =>
        s
          ? s.liked
            ? { liked: false, count: s.count - 1 }
            : { liked: true, count: s.count + 1 }
          : post
            ? { liked: !post.liked, count: post.likeCount + (post.liked ? -1 : 1) }
            : s,
      ),
    onError: () => toast.error('操作失败，请重试'),
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) return navigate('/login');
      if (!post) return;
      if (effectiveFav?.favorited) await unfavoritePost(post.id);
      else await favoritePost(post.id);
    },
    onMutate: () =>
      setFavState((s) =>
        s
          ? s.favorited
            ? { favorited: false, count: s.count - 1 }
            : { favorited: true, count: s.count + 1 }
          : post
            ? { favorited: !post.favorited, count: post.favoriteCount + (post.favorited ? -1 : 1) }
            : s,
      ),
    onError: () => toast.error('操作失败，请重试'),
  });

  useEffect(() => {
    applySeo({
      title: post ? `${post.title} - 星辰旅人论坛` : '星辰旅人论坛',
      description: post?.content
        ? post.content.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)
        : undefined,
      path: post ? `/post/${post.id}` : undefined,
      ogType: 'article',
    });
  }, [post]);

  /* 楼中楼：parentReplyId 分组 */
  const { topLevel, childrenMap } = useMemo(() => {
    const replies = repliesData?.replies ?? [];
    const top: Reply[] = [];
    const map = new Map<string, Reply[]>();
    for (const r of replies) {
      if (r.parentReplyId) {
        const list = map.get(r.parentReplyId) ?? [];
        list.push(r);
        map.set(r.parentReplyId, list);
      } else {
        top.push(r);
      }
    }
    return { topLevel: top, childrenMap: map };
  }, [repliesData]);

  if (isLoading) {
    return (
      <>
        <ColumnHeader back title="帖子" />
        <PostSkeleton />
        <div className="px-4 py-4"><Skeleton className="h-24" /></div>
      </>
    );
  }

  if (isError || !post) {
    return (
      <>
        <ColumnHeader back />
        <EmptyState
          title="帖子走丢了"
          description="它可能已被删除，或从未存在"
          action={<Button pill onClick={() => navigate('/')}>返回首页</Button>}
        />
      </>
    );
  }

  return (
    <>
      <ColumnHeader back title="帖子" />

      {/* 详情卡（无 hover 跳转） */}
      <div className="px-4 pt-3">
        <div className="flex gap-3">
          <button onClick={() => navigate(`/u/${post.authorName}`)} className="shrink-0">
            <Avatar src={post.authorAvatar} name={displayName(post.authorNickname ?? post.authorName)} size={44} />
          </button>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/u/${post.authorName}`)}
              className="block text-[15px] font-bold leading-snug hover:underline"
            >
              {displayName(post.authorNickname ?? post.authorName)}
            </button>
            <p className="text-[15px] text-muted">@{post.authorName}</p>
          </div>
        </div>

        <h1 className="mt-3 text-[22px] font-extrabold leading-snug tracking-tight">{post.title}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
          {post.categorySlug && (
            <button
              onClick={() => navigate(`/explore?category=${post.categorySlug}`)}
              className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold transition hover:border-brand hover:text-brand"
            >
              {post.categoryName}
            </button>
          )}
          {tagsOf(post.tags).map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/explore?tag=${encodeURIComponent(t)}`)}
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              #{t}
            </button>
          ))}
          <span className="text-sm">· {fullTime(post.createdAt)}</span>
          {post.editedAt && <span className="text-xs text-faint">已编辑</span>}
          <span className="flex items-center gap-1 text-sm">
            <Eye size={14} /> {formatCount(post.viewCount)}
          </span>
        </div>

        <RichText content={post.content} className="mt-3 text-[16px]" />

        <div className="mt-3 flex max-w-[425px] items-center justify-between border-t border-line pt-2.5">
          <ActionButton
            icon={<CornerDownRight size={17} />}
            count={post.replyCount}
            color="brand"
            label="回复"
            onClick={() => {
              setReplyTarget(null);
              document.getElementById('reply-composer')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <ActionButton
            icon={<Star size={17} className={cn(effectiveLike?.liked && 'fill-current')} />}
            count={effectiveLike?.count}
            color="like"
            label="点赞"
            active={effectiveLike?.liked}
            onClick={() => toggleLike.mutate()}
          />
          <ActionButton
            icon={<Bookmark size={17} className={cn(effectiveFav?.favorited && 'fill-current')} />}
            count={effectiveFav?.count}
            color="star"
            label="收藏"
            active={effectiveFav?.favorited}
            onClick={() => toggleFav.mutate()}
          />
          <ActionButton icon={<Eye size={17} />} count={post.viewCount} color="brand" label="浏览" readOnly />
        </div>
      </div>

      {/* 回复区 */}
      <div id="reply-composer" className="border-y border-line">
        {user ? (
          <Composer
            mode="reply"
            postId={post.id}
            replyTo={replyTarget}
            onDone={() => setReplyTarget(null)}
          />
        ) : (
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <p className="text-sm text-muted">登录后加入讨论</p>
            <Button pill onClick={() => navigate('/login')}>
              登录
            </Button>
          </div>
        )}
      </div>

      {repliesLoading ? (
        <><PostSkeleton /><PostSkeleton /></>
      ) : topLevel.length === 0 ? (
        <EmptyState
          icon={<CornerDownRight size={40} strokeWidth={1.2} />}
          title="还没有回复"
          description="抢沙发，做第一个回应的人"
        />
      ) : (
        topLevel.map((r) => (
          <div key={r.id}>
            <ReplyCard
              reply={r}
              postId={post.id}
              onReply={(target) => setReplyTarget({ id: target.id, name: displayName(target.authorName) })}
            />
            {(childrenMap.get(r.id) ?? []).map((child) => (
              <div key={child.id} className="ml-10 sm:ml-14">
                <ReplyCard
                  reply={child}
                  postId={post.id}
                  depth={1}
                  onReply={(target) =>
                    setReplyTarget({ id: r.id, name: displayName(target.authorName) })
                  }
                />
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
