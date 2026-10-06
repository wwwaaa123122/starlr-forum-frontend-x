/** 发帖器：标题 + Markdown 正文 + 星域分类 + 标签 + 图片上传 + @提及自动补全 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Hash, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPost, createReply, listCategories, searchUsers, uploadImage } from '@/lib/endpoints';
import { useAuth } from '@/lib/auth';
import { Avatar, Button, Dropdown, MenuItem } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const TITLE_MAX = 120;
const CONTENT_MAX = 50_000;
const TAGS_MAX = 5;

export function Composer({
  mode = 'post',
  postId,
  replyTo,
  onDone,
  autoFocus = false,
  compact = false,
}: {
  mode?: 'post' | 'reply';
  /** 回复目标帖 */
  postId?: string;
  /** 楼中楼回复目标（父回复 id + 楼层名） */
  replyTo?: { id: string; name: string } | null;
  onDone?: () => void;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: listCategories, enabled: mode === 'post' });
  const categories = catsData?.categories ?? [];

  // 默认选中第一个可用分类
  useEffect(() => {
    if (mode === 'post' && !categoryId && categories.length) {
      const first = categories.find((c) => c.postPolicy === 'everyone' || user?.role !== 'user');
      if (first) setCategoryId(first.slug);
    }
  }, [categories, categoryId, mode, user?.role]);

  // 自动增高（X 式纯 JS）
  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`;
  };
  useEffect(autosize, [content]);

  // 登录提醒
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  /* ---------------- @提及自动补全 ---------------- */
  const [mentionQuery, setMentionQuery] = useState<{ query: string; start: number } | null>(null);
  const { data: mentionData } = useQuery({
    queryKey: ['mention', mentionQuery?.query],
    queryFn: () => searchUsers(mentionQuery!.query),
    enabled: Boolean(mentionQuery && mentionQuery.query.length >= 1),
  });
  const mentionUsers = (mentionData?.users ?? []).slice(0, 5);

  const detectMention = () => {
    const el = textareaRef.current;
    if (!el) return setMentionQuery(null);
    const upto = el.value.slice(0, el.selectionStart);
    const m = upto.match(/@([\p{L}\p{N}_-]*)$/u);
    if (m && m[1].length <= 24) setMentionQuery({ query: m[1], start: el.selectionStart - m[1].length - 1 });
    else setMentionQuery(null);
  };

  const insertMention = (username: string) => {
    if (!mentionQuery) return;
    const el = textareaRef.current;
    if (!el) return;
    const before = content.slice(0, mentionQuery.start);
    const after = content.slice(mentionQuery.start + mentionQuery.query.length + 1);
    const next = `${before}@${username} ${after}`;
    setContent(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + username.length + 2;
      el.setSelectionRange(pos, pos);
    });
  };

  /* ---------------- 图片上传（插入 Markdown） ---------------- */
  const onPickImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error('图片不能超过 5MB');
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return toast.error('仅支持 JPEG/PNG/GIF/WEBP');
    setUploading(true);
    try {
      const url = await uploadImage(file, mode === 'reply' ? 'reply' : 'post');
      const el = textareaRef.current;
      const cursor = el?.selectionStart ?? content.length;
      const md = `\n![图片](${url})\n`;
      setContent((c) => c.slice(0, cursor) + md + c.slice(cursor));
      toast.success('图片已上传');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ---------------- 提交 ---------------- */
  const submit = async () => {
    if (mode === 'post') {
      if (title.trim().length < 2) return toast.error('标题至少 2 个字符');
      if (!content.trim()) return toast.error('正文不能为空');
      if (!categoryId) return toast.error('请选择星域分类');
      setSubmitting(true);
      try {
        await createPost({ title: title.trim(), content, categoryId, tags });
        toast.success('发布成功，愿星光不灭');
        setContent('');
        setTitle('');
        setTags([]);
        void queryClient.invalidateQueries({ queryKey: ['posts'] });
        onDone?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '发布失败');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!postId || !content.trim()) return;
      setSubmitting(true);
      try {
        if (replyTo && content.startsWith(`回复 @${replyTo.name}：`)) {
          // 楼中楼：正文前缀剥离，传 parentReplyId
          const body = content.slice(`回复 @${replyTo.name}：`.length).trim();
          await updateReplyOrReply(postId, body);
        } else {
          await updateReplyOrReply(postId, content);
        }
        toast.success('回复成功');
        setContent('');
        void queryClient.invalidateQueries({ queryKey: ['replies', postId] });
        void queryClient.invalidateQueries({ queryKey: ['post', postId] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        onDone?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '回复失败');
      } finally {
        setSubmitting(false);
      }
    }

    async function updateReplyOrReply(pid: string, body: string) {
      if (replyTo) {
        // 编辑场景不在此处；直接创建楼中楼回复
        await createReply(pid, { content: body, parentReplyId: replyTo.id });
      } else {
        await createReply(pid, { content: body });
      }
    }
  };

  if (!user) return null;

  const titleLen = title.trim().length;
  const contentLen = content.length;
  const canSubmit =
    mode === 'post'
      ? titleLen >= 2 && titleLen <= TITLE_MAX && contentLen > 0 && contentLen <= CONTENT_MAX && !submitting
      : contentLen > 0 && contentLen <= 20_000 && !submitting;

  const selectedCat = categories.find((c) => c.slug === categoryId);

  return (
    <div className={cn('flex gap-3', compact ? 'px-4 py-3' : 'px-4 py-3')}>
      <Avatar src={user.avatarUrl} name={user.nickname || user.username} size={42} className="shrink-0" />
      <div className="min-w-0 flex-1">
        {/* 回复目标提示 */}
        {mode === 'reply' && replyTo && (
          <p className="mb-1 text-sm text-muted">
            回复 <span className="font-semibold text-brand">@{replyTo.name}</span>
          </p>
        )}

        {/* 标题（仅发帖） */}
        {mode === 'post' && (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="点亮一个标题…"
            className="w-full bg-transparent py-1.5 text-xl font-extrabold tracking-tight outline-none placeholder:text-faint"
          />
        )}
        {mode === 'post' && titleLen >= TITLE_MAX - 20 && (
          <p className={cn('mb-1 text-right text-xs', titleLen >= TITLE_MAX ? 'text-danger' : 'text-muted')}>
            {TITLE_MAX - titleLen}
          </p>
        )}

        {/* 正文 */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              detectMention();
            }}
            onClick={detectMention}
            onKeyUp={detectMention}
            onBlur={() => window.setTimeout(() => setMentionQuery(null), 150)}
            placeholder={mode === 'post' ? '分享你的星际见闻，支持 Markdown…' : '写下你的回复…'}
            rows={mode === 'post' ? 3 : 2}
            autoFocus={autoFocus}
            className="w-full resize-none bg-transparent py-1.5 text-[17px] leading-relaxed outline-none placeholder:text-faint"
          />
          {/* @提及浮层 */}
          {mentionQuery && mentionUsers.length > 0 && (
            <div className="absolute left-0 top-full z-30 w-64 overflow-hidden rounded-xl border border-line bg-canvas py-1 shadow-2xl">
              {mentionUsers.map((u) => (
                <button
                  key={u.username}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(u.username);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface2"
                >
                  <Avatar src={u.avatarUrl} name={u.nickname || u.username} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{u.nickname || u.username}</span>
                    <span className="block truncate text-xs text-muted">@{u.username}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 标签 chips */}
        {mode === 'post' && tags.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-semibold text-brand"
              >
                #{t}
                <button onClick={() => setTags((ts) => ts.filter((x) => x !== t))} aria-label={`移除标签 ${t}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 工具行 */}
        <div className="mt-1 flex items-center justify-between border-t border-line pt-2">
          <div className="-ml-2 flex items-center gap-0.5">
            {mode === 'post' && (
              <>
                {/* 分类选择 */}
                <Dropdown
                  align="left"
                  trigger={({ toggle }) => (
                    <button
                      onClick={toggle}
                      className="btn-icon focus-ring h-9 gap-1 px-2.5 text-[13px] font-semibold text-muted hover:bg-brand-soft hover:text-brand"
                    >
                      <Hash size={16} />
                      <span className="max-w-[88px] truncate">{selectedCat?.name ?? '星域'}</span>
                      <ChevronDown size={13} />
                    </button>
                  )}
                >
                  {() => (
                    <div className="max-h-72 overflow-y-auto">
                      {categories.map((c) => {
                        const locked = c.postPolicy === 'staff' && (!user || user.role === 'user');
                        return (
                          <MenuItem
                            key={c.id}
                            disabled={locked}
                            className={cn(locked && 'opacity-40')}
                            onClick={() => {
                              if (locked) return toast.error('该星域仅限版主及以上发布');
                              setCategoryId(c.slug);
                            }}
                          >
                            <span className="flex flex-col">
                              <span>{c.name}</span>
                              <span className="text-xs font-normal text-muted">
                                {locked ? '仅版主及以上' : c.description || '自由发布'}
                              </span>
                            </span>
                          </MenuItem>
                        );
                      })}
                    </div>
                  )}
                </Dropdown>

                {/* 图片上传 */}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="插入图片"
                  className="btn-icon focus-ring h-9 w-9 text-brand hover:bg-brand-soft"
                >
                  {uploading ? <Loader2 size={17} className="animate-spin" /> : <ImageIcon size={17} />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickImage(f);
                  }}
                />

                {/* 标签输入（xsm 屏隐藏，用 chips 编辑） */}
                <button
                  onClick={() => {
                    const t = tagDraft.trim() || window.prompt('输入标签（最多 5 个）')?.trim();
                    if (!t) return;
                    if (t.length > 24) return toast.error('标签最多 24 字');
                    if (tags.length >= TAGS_MAX) return toast.error('最多 5 个标签');
                    if (!tags.includes(t)) setTags((ts) => [...ts, t]);
                  }}
                  aria-label="添加标签"
                  className="btn-icon focus-ring h-9 w-9 text-brand hover:bg-brand-soft"
                >
                  <span className="text-base font-bold">#</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 字数提示 */}
            {mode === 'reply' && contentLen > 19_000 && (
              <span className={cn('text-xs', contentLen > 20_000 ? 'text-danger' : 'text-muted')}>
                {20_000 - contentLen}
              </span>
            )}
            <Button pill size="sm" className="h-9 px-4" disabled={!canSubmit} onClick={() => void submit()}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : mode === 'post' ? '发帖' : '回复'}
            </Button>
          </div>
        </div>

        {/* 标签草稿（隐藏 input 保留未来内联编辑） */}
        <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} className="hidden" aria-hidden />
      </div>
    </div>
  );
}

/** 计算文本摘要（供回复引用） */
export function useExcerpt(text: string, max = 60) {
  return useMemo(() => {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
  }, [text, max]);
}
