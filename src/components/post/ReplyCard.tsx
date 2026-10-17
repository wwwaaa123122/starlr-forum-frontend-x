/** 回复卡片：支持楼中楼缩进、点赞、编辑/删除、被回复人提示 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CornerDownRight, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReply, likeReply, unlikeReply, updateReply } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { ActionButton } from './PostCard';
import { Avatar, Button, Dropdown, MenuItem, Textarea } from '@/components/ui/primitives';
import { RichText } from '@/lib/markdown';
import { cn, displayName, relativeTime } from '@/lib/utils';
import type { Reply } from '@/lib/types';

export function ReplyCard({
  reply,
  postId,
  showPostTitle,
  depth = 0,
  hideAuthor,
  onReply,
}: {
  reply: Reply;
  postId?: string;
  showPostTitle?: boolean;
  depth?: number;
  /** 个人主页等场景：作者即本人，隐藏头像与名字 */
  hideAuthor?: boolean;
  onReply?: (reply: Reply) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(Boolean(reply.liked));
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reply.content);
  const [removed, setRemoved] = useState(false);

  const isAuthor = user?.id === reply.authorId;
  const canModerate = user?.role === 'admin' || user?.role === 'moderator';
  const effectivePostId = postId ?? (reply as Reply & { postId?: string }).postId;

  const invalidate = () => {
    if (effectivePostId) void queryClient.invalidateQueries({ queryKey: ['replies', effectivePostId] });
    void queryClient.invalidateQueries({ queryKey: ['user-replies'] });
  };

  const likeMut = useMutation({
    mutationFn: async () => {
      if (!user) return navigate('/login');
      if (liked) await unlikeReply(reply.id);
      else await likeReply(reply.id);
    },
    onMutate: () => {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
    },
    onError: () => {
      setLiked(Boolean(reply.liked));
      setLikeCount(reply.likeCount);
      toast.error('操作失败');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteReply(reply.id),
    onSuccess: () => {
      toast.success('回复已删除');
      setRemoved(true);
      invalidate();
    },
    onError: () => toast.error('删除失败'),
  });

  const editMut = useMutation({
    mutationFn: () => updateReply(reply.id, draft.trim()),
    onSuccess: () => {
      toast.success('已更新');
      setEditing(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '更新失败'),
  });

  if (removed) return null;

  return (
    <article
      className={cn(
        'border-b border-line px-4 py-3 transition',
        depth > 0 && 'border-l-2 border-l-line bg-surface/40 pl-3',
      )}
    >
      <div className="flex gap-3">
        {!hideAuthor && (
          <Link to={`/u/${reply.authorName}`} className="shrink-0">
            <Avatar src={reply.authorAvatar} name={displayName(reply.authorNickname ?? reply.authorName)} size={depth > 0 ? 34 : 40} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {!hideAuthor ? (
            <div className="flex items-center gap-1 text-[15px] leading-snug">
              <Link to={`/u/${reply.authorName}`} className="truncate font-bold hover:underline">
                {displayName(reply.authorNickname ?? reply.authorName)}
              </Link>
              <span className="truncate text-muted">@{reply.authorName}</span>
              <span className="text-muted">·</span>
              <time className="shrink-0 text-muted">{relativeTime(reply.createdAt)}</time>
              {reply.editedAt && <span className="shrink-0 text-xs text-faint">已编辑</span>}
              <div className="ml-auto shrink-0">
              <Dropdown
                trigger={({ toggle }) => (
                  <button
                    onClick={toggle}
                    aria-label="更多"
                    className="btn-icon focus-ring -mr-2 h-8 w-8 text-muted hover:bg-brand-soft hover:text-brand"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                )}
              >
                {(close) => (
                  <>
                    {isAuthor && (
                      <MenuItem
                        icon={<Pencil size={15} />}
                        onClick={() => {
                          close();
                          setEditing(true);
                        }}
                      >
                        编辑
                      </MenuItem>
                    )}
                    {(isAuthor || canModerate) && (
                      <MenuItem
                        danger
                        icon={<Trash2 size={15} />}
                        onClick={() => {
                          close();
                          if (confirm('确定删除这条回复吗？')) deleteMut.mutate();
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
          ) : (
            <div className="flex items-center gap-1 text-[15px] leading-snug">
              <span className="text-muted">·</span>
              <time className="shrink-0 text-muted">{relativeTime(reply.createdAt)}</time>
              {reply.editedAt && <span className="shrink-0 text-xs text-faint">已编辑</span>}
              <div className="ml-auto shrink-0">
                <Dropdown
                  trigger={({ toggle }) => (
                    <button
                      onClick={toggle}
                      aria-label="更多"
                      className="btn-icon focus-ring -mr-2 h-8 w-8 text-muted hover:bg-brand-soft hover:text-brand"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      {isAuthor && (
                        <MenuItem
                          icon={<Pencil size={15} />}
                          onClick={() => {
                            close();
                            setEditing(true);
                          }}
                        >
                          编辑
                        </MenuItem>
                      )}
                      {(isAuthor || canModerate) && (
                        <MenuItem
                          danger
                          icon={<Trash2 size={15} />}
                          onClick={() => {
                            close();
                            if (confirm('确定删除这条回复吗？')) deleteMut.mutate();
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
          )}

          {reply.replyToUserName && (
            <p className="flex items-center gap-1 text-[13px] text-muted">
              <CornerDownRight size={12} /> 回复 <span className="text-brand">@{reply.replyToUserName}</span>
            </p>
          )}

          {showPostTitle && (reply as Reply & { postTitle?: string }).postTitle && (
            <Link
              to={`/post/${(reply as Reply & { postId?: string }).postId}`}
              className="mt-1 block line-clamp-1 text-sm text-muted hover:underline"
            >
              在「{(reply as Reply & { postTitle?: string }).postTitle}」中回复
            </Link>
          )}

          {editing ? (
            <div className="mt-1.5">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="text-[15px]"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  pill
                  onClick={() => {
                    setEditing(false);
                    setDraft(reply.content);
                  }}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  pill
                  disabled={!draft.trim() || editMut.isPending}
                  onClick={() => editMut.mutate()}
                >
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <RichText content={reply.content} className="mt-0.5" />
          )}

          <div className="mt-1.5 flex max-w-[320px] items-center gap-6">
            <ActionButton
              icon={<Star size={16} className={cn(liked && 'fill-current')} />}
              count={likeCount}
              color="like"
              label="点赞"
              active={liked}
              onClick={() => likeMut.mutate()}
            />
            {onReply && (
              <ActionButton
                icon={<CornerDownRight size={16} />}
                color="brand"
                label="回复"
                onClick={() => onReply(reply)}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
