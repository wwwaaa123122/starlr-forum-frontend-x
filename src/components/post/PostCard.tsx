/** 信息流帖子卡片：X 式 PostCard 的论坛适配（头像 + 名行 + 标题/摘要 + 操作条） */
import { memo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Bookmark,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Repeat2,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createReport,
  deletePost,
  favoritePost,
  likePost,
  unfavoritePost,
  unlikePost,
} from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { Avatar, Dropdown, MenuItem } from '@/components/ui/primitives';
import { cn, displayName, formatCount, relativeTime, stripMarkdown, tagsOf } from '@/lib/utils';
import type { PostSummary } from '@/lib/types';

interface PostCardProps {
  post: PostSummary;
  /** 当前用户互动状态（详情页/个人页可传入） */
  liked?: boolean;
  favorited?: boolean;
  /** 详情页正文全量渲染 */
  rich?: false;
  showCategory?: boolean;
  onDeleted?: () => void;
}

export const PostCard = memo(function PostCard({
  post,
  liked = false,
  favorited = false,
  showCategory = true,
  onDeleted,
}: PostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [likeState, setLikeState] = useState({ liked, count: post.likeCount });
  const [favState, setFavState] = useState({ favorited, count: post.favoriteCount });
  const [deleted, setDeleted] = useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
    void queryClient.invalidateQueries({ queryKey: ['post', post.id] });
  };

  const likeMut = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (likeState.liked) await unlikePost(post.id);
      else await likePost(post.id);
    },
    onMutate: () => {
      setLikeState((s) =>
        s.liked ? { liked: false, count: s.count - 1 } : { liked: true, count: s.count + 1 },
      );
    },
    onError: () => {
      setLikeState({ liked, count: post.likeCount });
      toast.error('操作失败，请重试');
    },
    onSuccess: invalidate,
  });

  const favMut = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/login');
        return;
      }
      if (favState.favorited) await unfavoritePost(post.id);
      else await favoritePost(post.id);
    },
    onMutate: () => {
      setFavState((s) =>
        s.favorited ? { favorited: false, count: s.count - 1 } : { favorited: true, count: s.count + 1 },
      );
    },
    onError: () => {
      setFavState({ favorited, count: post.favoriteCount });
      toast.error('操作失败，请重试');
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      toast.success('帖子已删除');
      setDeleted(true);
      onDeleted?.();
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '删除失败'),
  });

  const shareMut = useMutation({
    mutationFn: async () => {
      const url = `${location.origin}/post/${post.id}`;
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return 'shared';
      }
      await navigator.clipboard.writeText(url);
      return 'copied';
    },
    onSuccess: (r) => toast.success(r === 'copied' ? '链接已复制' : '已分享'),
    onError: () => toast.error('分享失败'),
  });

  const reportMut = useMutation({
    mutationFn: () =>
      createReport({ targetType: 'post', targetId: post.id, reason: 'other', detail: post.title }),
    onSuccess: () => toast.success('举报已提交，感谢守护社区'),
    onError: (e) => toast.error(e instanceof Error ? e.message : '举报失败'),
  });

  if (deleted) return null;
  const tags = tagsOf(post.tags).slice(0, 3);
  const excerpt = stripMarkdown(post.excerpt ?? '');
  const isAuthor = user && user.id === post.authorId;
  const canModerate = user && (user.role === 'admin' || user.role === 'moderator');

  return (
    <article
      className="post-card cursor-pointer border-b border-line px-4 py-3"
      onClick={() => navigate(`/post/${post.id}`)}
    >
      <div className="flex gap-3">
        <Link to={`/u/${post.authorName}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Avatar src={post.authorAvatar} name={displayName(post.authorName)} size={42} />
        </Link>

        <div className="min-w-0 flex-1">
          {/* 头部行：昵称 @用户名 · 时间 + 菜单 */}
          <div className="flex items-center gap-1 leading-snug">
            <Link
              to={`/u/${post.authorName}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-[15px] font-bold hover:underline"
            >
              {displayName(post.authorName)}
            </Link>
            {post.authorRole === 'admin' && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-brand">
                <Star size={10} className="fill-current" /> 站长
              </span>
            )}
            {post.authorRole === 'moderator' && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-1.5 text-[11px] font-bold text-boost">
                <Sparkles size={10} /> 版主
              </span>
            )}
            <span className="truncate text-[15px] text-muted">@{post.authorName}</span>
            <span className="text-muted">·</span>
            <time className="shrink-0 text-[15px] text-muted" title={post.createdAt}>
              {relativeTime(post.createdAt)}
            </time>
            <div className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
              <Dropdown
                trigger={({ toggle }) => (
                  <button
                    onClick={toggle}
                    aria-label="更多"
                    className="btn-icon focus-ring -mr-2 h-8 w-8 text-muted hover:bg-brand-soft hover:text-brand"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<Share2 size={16} />}
                      onClick={() => {
                        close();
                        shareMut.mutate();
                      }}
                    >
                      分享
                    </MenuItem>
                    {!isAuthor && (
                      <MenuItem
                        icon={<Flag size={16} />}
                        onClick={() => {
                          close();
                          if (!user) return navigate('/login');
                          reportMut.mutate();
                        }}
                      >
                        举报
                      </MenuItem>
                    )}
                    {(isAuthor || canModerate) && (
                      <MenuItem
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => {
                          close();
                          if (confirm(`确定删除「${post.title}」吗？`)) deleteMut.mutate();
                        }}
                      >
                        删除
                      </MenuItem>
                    )}
                  </>
                )}
              </Dropdown>
            </div>
          </div>

          {/* 置顶 / 精华标记 */}
          {(Boolean(post.isPinned) || Boolean(post.isFeatured)) && (
            <div className="mb-0.5 flex items-center gap-3 text-[13px] font-bold">
              {Boolean(post.isPinned) && (
                <span className="flex items-center gap-1 text-brand">
                  <Pin size={12} /> 置顶
                </span>
              )}
              {Boolean(post.isFeatured) && (
                <span className="flex items-center gap-1 text-star">
                  <Sparkles size={12} /> 精华
                </span>
              )}
            </div>
          )}

          {/* 标题 */}
          <h2 className="mt-0.5 line-clamp-2 text-[17px] font-extrabold leading-snug tracking-tight">
            {post.title}
          </h2>

          {/* 摘要 */}
          {excerpt && <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-muted">{excerpt}</p>}

          {/* 标签 + 分类 */}
          {(tags.length > 0 || (showCategory && post.categoryName)) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {showCategory && post.categorySlug && (
                <Link
                  to={`/explore?category=${post.categorySlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-brand"
                >
                  {post.categoryName}
                </Link>
              )}
              {tags.map((t) => (
                <Link
                  key={t}
                  to={`/explore?tag=${encodeURIComponent(t)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[13px] font-semibold text-brand hover:underline"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {/* 操作条 */}
          <div className="mt-2.5 flex max-w-[425px] items-center justify-between">
            <ActionButton
              icon={<MessageCircle size={17} />}
              count={post.replyCount}
              color="brand"
              label="回复"
              onClick={() => navigate(`/post/${post.id}`)}
            />
            <ActionButton
              icon={<Repeat2 size={19} />}
              color="boost"
              label="转发"
              onClick={() => {
                shareMut.mutate();
              }}
            />
            <ActionButton
              icon={<Star size={17} className={cn(likeState.liked && 'fill-current')} />}
              count={likeState.count}
              active={likeState.liked}
              color="like"
              label="点赞"
              onClick={(e) => {
                e.stopPropagation();
                likeMut.mutate();
              }}
            />
            <ActionButton
              icon={<Bookmark size={17} className={cn(favState.favorited && 'fill-current')} />}
              count={favState.count}
              active={favState.favorited}
              color="star"
              label="收藏"
              onClick={(e) => {
                e.stopPropagation();
                favMut.mutate();
              }}
            />
            <ActionButton
              icon={<BarChart3 size={17} />}
              count={post.viewCount}
              color="brand"
              label="浏览"
              readOnly
            />
          </div>
        </div>
      </div>
    </article>
  );
});

/* ---------------- 操作按钮（品牌色 + /10 光晕 hover） ---------------- */

const COLOR_CLASSES = {
  brand: {
    text: 'group-hover:text-brand',
    halo: 'group-hover:bg-brand-soft',
    active: 'text-brand',
  },
  like: {
    text: 'group-hover:text-like',
    halo: 'group-hover:bg-like/10',
    active: 'text-like',
  },
  boost: {
    text: 'group-hover:text-boost',
    halo: 'group-hover:bg-boost/10',
    active: 'text-boost',
  },
  star: {
    text: 'group-hover:text-star',
    halo: 'group-hover:bg-star/10',
    active: 'text-star',
  },
} as const;

export function ActionButton({
  icon,
  count,
  color,
  label,
  active,
  onClick,
  readOnly,
}: {
  icon: React.ReactNode;
  count?: number;
  color: keyof typeof COLOR_CLASSES;
  label: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  readOnly?: boolean;
}) {
  const c = COLOR_CLASSES[color];
  return (
    <button
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        if (!readOnly) onClick?.(e);
      }}
      className={cn(
        'focus-ring group -ml-2 flex items-center gap-0.5 text-[13px] leading-4',
        readOnly ? 'cursor-default text-muted' : active ? c.active : 'text-muted',
      )}
    >
      <span
        className={cn(
          'btn-icon h-[34px] w-[34px]',
          c.halo,
          readOnly ? '' : c.text,
          active && c.active,
        )}
      >
        {icon}
      </span>
      {count != null && count > 0 && (
        <span className={cn('min-w-[24px] text-left', active && c.active)}>{formatCount(count)}</span>
      )}
    </button>
  );
}
