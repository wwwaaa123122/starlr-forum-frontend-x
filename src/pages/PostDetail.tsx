/** 帖子详情：正文 Markdown + 操作条 + 楼中楼回复 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CornerDownRight, Bookmark, Eye, Loader2, Pencil, Star } from 'lucide-react';
import { toast } from 'sonner';
import {
  favoritePost,
  getPost,
  likePost,
  listReplies,
  markView,
  unfavoritePost,
  unlikePost,
  updatePost,
} from '@/lib/endpoints';
import { ColumnHeader } from '@/components/layout/ColumnHeader';
import { useAuth } from '@/lib/auth';
import { applySeo } from '@/lib/seo';
import { ActionButton } from '@/components/post/PostCard';
import { Composer } from '@/components/post/Composer';
import { ReplyCard } from '@/components/post/ReplyCard';
import { PostSkeleton } from '@/components/post/PostSkeleton';
import { RoleBadge } from '@/components/post/RoleBadge';
import { Avatar, Button, EmptyState, Input, Modal, Skeleton, Textarea } from '@/components/ui/primitives';
import { RichText } from '@/lib/markdown';
import { displayName, formatCount, fullTime, tagsOf } from '@/lib/utils';
import type { Reply } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSiteConfig, siteTitle } from '@/lib/useSiteConfig';

export default function PostDetail() {
  const cfg = useSiteConfig();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  /** 已上报浏览量的帖子 id（/post/:id 换参不重挂载，按 id 去重） */
  const lastViewedRef = useRef<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPost(id),
  });

  const {
    data: repliesData,
    isLoading: repliesLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['replies', id],
    queryFn: ({ pageParam }) => listReplies(id, pageParam, 50),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasMore ? last.pagination.page + 1 : undefined),
    enabled: Boolean(data),
  });

  // 浏览量上报（同一帖子只上报一次；换帖后重新上报）
  useEffect(() => {
    if (!id || lastViewedRef.current === id) return;
    lastViewedRef.current = id;
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

  /* 从列表卡片菜单「编辑」跳转过来：详情加载完成后自动打开编辑框 */
  const [searchParams, setSearchParams] = useSearchParams();
  const [autoEditHandled, setAutoEditHandled] = useState(false);
  useEffect(() => {
    if (searchParams.get('edit') === '1' && post && !autoEditHandled) {
      setEditTitle(post.title);
      setEditContent(post.content);
      setEditing(true);
      setAutoEditHandled(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, post, autoEditHandled, setSearchParams]);

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

  /* 编辑帖子（作者或版主） */
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const openEdit = () => {
    setEditTitle(post?.title ?? '');
    setEditContent(post?.content ?? '');
    setEditing(true);
  };
  const editMut = useMutation({
    mutationFn: () => updatePost(post!.id, { title: editTitle.trim(), content: editContent.trim() }),
    onSuccess: async () => {
      setEditing(false);
      toast.success('帖子已更新');
      await queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: (e: Error) => toast.error(e.message || '保存失败，请重试'),
  });

  useEffect(() => {
    applySeo({
      // 文章页标题直接用文章标题；数据未到时用站点名兜底
      title: post ? post.title : siteTitle(cfg),
      description: post?.content
        ? post.content.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~\-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)
        : undefined,
      path: post ? `/post/${post.id}` : undefined,
      ogType: 'article',
    });
  }, [post]);

  /* 楼中楼：parentReplyId 分组（跨所有已加载页） */
  const replies = useMemo(() => repliesData?.pages.flatMap((p) => p.replies) ?? [], [repliesData]);
  const { topLevel, childrenMap } = useMemo(() => {
    const top: Reply[] = [];
    const map = new Map<string, Reply[]>();
    const topIds = new Set(replies.filter((r) => !r.parentReplyId).map((r) => r.id));
    // 回复只展示两层：顶层 + 子回复；挂在自己子回复下的回复提升到顶层该楼（避免深层嵌套丢失）
    const rootOf = (r: Reply): string | null => {
      const seen = new Set<string>();
      let cur = r;
      while (cur.parentReplyId && !seen.has(cur.id)) {
        seen.add(cur.id);
        if (topIds.has(cur.parentReplyId)) return cur.parentReplyId;
        const parent = replies.find((x) => x.id === cur.parentReplyId);
        if (!parent) return cur.parentReplyId; // 父被删除等异常情况：仍挂在原 parent 上
        cur = parent;
      }
      return null;
    };
    for (const r of replies) {
      if (!r.parentReplyId) {
        top.push(r);
        continue;
      }
      const key = rootOf(r) ?? r.parentReplyId;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return { topLevel: top, childrenMap: map };
  }, [replies]);

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
            <p className="flex items-center gap-1 text-[15px] text-muted">
              @{post.authorName}
              <RoleBadge role={post.authorRole} uid={post.authorUid} />
            </p>
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
          {(post.isAuthor || post.canModerate) && (
            <button
              onClick={openEdit}
              className="flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
              aria-label="编辑帖子"
            >
              <Pencil size={13} /> 编辑
            </button>
          )}
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

      {hasNextPage && (
        <div className="flex justify-center border-b border-line py-4">
          <Button variant="outline" pill disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage ? <Loader2 size={15} className="animate-spin" /> : null} 加载更多回复
          </Button>
        </div>
      )}

      {/* 编辑帖子对话框 */}
      {editing && (
        <Modal
          open
          onClose={() => setEditing(false)}
        >
          <div className="space-y-3">
            <h2 className="text-[16px] font-bold">编辑帖子</h2>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="标题"
              maxLength={100}
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={10}
              placeholder="正文（支持 Markdown）"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" pill onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button pill disabled={!editTitle.trim() || !editContent.trim() || editMut.isPending} onClick={() => editMut.mutate()}>
                {editMut.isPending ? <Loader2 size={15} className="animate-spin" /> : null} 保存
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
