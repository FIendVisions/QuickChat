'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessagesSquare,
  Users,
  X,
  Heart,
  Search,
  PenLine,
  MessageCircle,
  Maximize2,
  Pencil,
} from 'lucide-react';
import type { Channel } from '@/types/channel.types';
import { ChannelMembers } from '@/components/channel/ChannelMembers';
import { ForumMarkdown } from '@/components/chat/ForumMarkdown';
import {
  forumApi,
  type ForumPostListItem,
  type ForumPostDetail,
} from '@/services/api/forum.api';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** 与新建时间明显不同才视为已编辑（避免 DB 同毫秒写入） */
function wasEdited(post: { createdAt: string; updatedAt: string }) {
  return new Date(post.updatedAt).getTime() - new Date(post.createdAt).getTime() > 2000;
}

export interface ForumChannelMainProps {
  channel: Channel;
  user: { id: string; username: string };
  isOwner: boolean;
  isOfficialChannel: boolean;
  onLeaveChannel: () => void;
  onOpenSettings: () => void;
}

export function ForumChannelMain({
  channel,
  user,
  isOwner,
  isOfficialChannel,
  onLeaveChannel,
  onOpenSettings,
}: ForumChannelMainProps) {
  const [posts, setPosts] = useState<ForumPostListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ForumPostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newBusy, setNewBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedQ(searchInput), 280);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const loadPosts = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const { posts: list } = await forumApi.listPosts(
        channel.id,
        user.id,
        debouncedQ || undefined,
      );
      setPosts(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载帖子失败');
      setPosts([]);
    } finally {
      setListLoading(false);
    }
  }, [channel.id, user.id, debouncedQ]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    setEditMode(false);
    setReaderOpen(false);
  }, [selectedPostId]);

  useEffect(() => {
    if (!selectedPostId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void forumApi
      .getPost(channel.id, selectedPostId, user.id)
      .then((r) => {
        if (!cancelled) setDetail(r.post);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载文章失败');
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPostId, channel.id, user.id]);

  const handleToggleLike = async () => {
    if (!detail || likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await forumApi.toggleLike(channel.id, detail.id, user.id);
      setDetail((d) =>
        d
          ? {
              ...d,
              likedByMe: r.liked,
              likeCount: r.likeCount,
            }
          : null,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detail.id ? { ...p, likeCount: r.likeCount } : p,
        ),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '点赞失败');
    } finally {
      setLikeBusy(false);
    }
  };

  const handleSendComment = async () => {
    if (!detail || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      const { comment } = await forumApi.addComment(
        channel.id,
        detail.id,
        user.id,
        commentText.trim(),
      );
      setCommentText('');
      setDetail((d) =>
        d
          ? {
              ...d,
              comments: [...d.comments, comment],
              commentCount: d.commentCount + 1,
            }
          : null,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detail.id ? { ...p, commentCount: p.commentCount + 1 } : p,
        ),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '留言失败');
    } finally {
      setCommentBusy(false);
    }
  };

  const canEditPost = Boolean(
    detail && (detail.author.id === user.id || isOwner),
  );

  const startEdit = () => {
    if (!detail) return;
    setEditTitle(detail.title);
    setEditContent(detail.content);
    setEditMode(true);
    setReaderOpen(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!detail || saveBusy) return;
    if (!editTitle.trim()) {
      setError('标题不能为空');
      return;
    }
    setSaveBusy(true);
    setError(null);
    try {
      const { post } = await forumApi.updatePost(channel.id, detail.id, {
        userId: user.id,
        title: editTitle.trim(),
        content: editContent,
      });
      setDetail(post);
      setEditMode(false);
      await loadPosts();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || newBusy) return;
    setNewBusy(true);
    setError(null);
    try {
      const { post } = await forumApi.createPost(channel.id, {
        userId: user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      setNewOpen(false);
      setNewTitle('');
      setNewContent('');
      await loadPosts();
      setSelectedPostId(post.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '发布失败');
    } finally {
      setNewBusy(false);
    }
  };

  const channelMark = '📋';

  return (
    <div className="flex h-full min-h-0 flex-col bg-dc-chat">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/20 bg-dc-chat px-4 shadow-dc-header">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl leading-none text-dc-channel-text">{channelMark}</span>
          <h2 className="truncate text-base font-semibold text-dc-channel-text-active">
            {channel.name}
          </h2>
          <span className="shrink-0 rounded bg-[#5865f2]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#949cf7]">
            论坛
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMembersOpen(true)}
            className="rounded p-2 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
            title="成员列表"
          >
            <Users size={20} strokeWidth={2} />
          </button>
          {isOwner && !isOfficialChannel && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded p-2 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
              title="频道设置"
            >
              ⚙️
            </button>
          )}
          {!isOfficialChannel && (
            <button
              type="button"
              onClick={onLeaveChannel}
              className="rounded px-3 py-1.5 text-sm font-medium text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
            >
              退出频道
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="flex w-[min(100%,400px)] shrink-0 flex-col border-r border-black/20 bg-[#2b2d31]">
          <div className="flex shrink-0 flex-col gap-2 border-b border-black/20 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dc-channel-text/60"
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索文章标题…"
                className="w-full rounded-md border border-black/25 bg-[#1e1f22] py-2 pl-9 pr-3 text-sm text-dc-channel-text-active placeholder:text-dc-channel-text/50 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="flex items-center justify-center gap-2 rounded-md bg-[#5865f2] py-2 text-sm font-medium text-white hover:bg-[#4752c4]"
            >
              <PenLine size={16} />
              新建文章
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listLoading ? (
              <p className="px-3 py-4 text-center text-sm text-dc-channel-text">加载中…</p>
            ) : posts.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-dc-channel-text">
                {debouncedQ ? '没有匹配的文章' : '还没有文章，点击上方新建'}
              </p>
            ) : (
              <ul className="space-y-0.5 p-1">
                {posts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPostId(p.id)}
                      className={`flex w-full flex-col gap-1 rounded-md px-2 py-2.5 text-left transition-colors ${
                        selectedPostId === p.id
                          ? 'bg-dc-channel-active text-dc-channel-text-active'
                          : 'text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active'
                      }`}
                    >
                      <span className="line-clamp-2 text-[15px] font-semibold leading-snug">
                        {p.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-70">
                        <span>{p.author.username}</span>
                        <span>{formatTime(p.createdAt)}</span>
                        <span className="flex items-center gap-0.5">
                          <Heart size={11} className="inline" />
                          {p.likeCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle size={11} className="inline" />
                          {p.commentCount}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-dc-chat">
          {detailLoading && selectedPostId ? (
            <div className="flex flex-1 items-center justify-center text-dc-channel-text">
              加载文章…
            </div>
          ) : detail ? (
            <>
              <div className="shrink-0 border-b border-black/20 px-6 py-4">
                {editMode ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                    className="mb-2 w-full rounded-md border border-black/25 bg-[#1e1f22] px-3 py-2 text-xl font-bold text-dc-channel-text-active focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  />
                ) : (
                  <h1 className="text-xl font-bold leading-snug text-dc-channel-text-active">
                    {detail.title}
                  </h1>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-dc-channel-text">
                  <span className="font-medium text-dc-channel-text-active">
                    {detail.author.username}
                  </span>
                  <span className="text-xs opacity-80">
                    发布于 {formatTime(detail.createdAt)}
                  </span>
                  {wasEdited(detail) && (
                    <span className="text-xs text-[#faa61a]">
                      最后编辑 {formatTime(detail.updatedAt)}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={likeBusy}
                    onClick={() => void handleToggleLike()}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors ${
                      detail.likedByMe
                        ? 'bg-[#f23f43]/20 text-[#f23f43]'
                        : 'bg-dc-channels text-dc-channel-text hover:bg-dc-channel-hover'
                    }`}
                  >
                    <Heart
                      size={16}
                      className={detail.likedByMe ? 'fill-current' : ''}
                      strokeWidth={2}
                    />
                    {detail.likeCount}
                  </button>
                  {!editMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => setReaderOpen(true)}
                        className="inline-flex items-center gap-1 rounded-md bg-dc-channels px-2 py-1 text-sm font-medium text-dc-channel-text hover:bg-dc-channel-hover"
                        title="全屏阅读"
                      >
                        <Maximize2 size={16} />
                        缩放阅读
                      </button>
                      {canEditPost && (
                        <button
                          type="button"
                          onClick={startEdit}
                          className="inline-flex items-center gap-1 rounded-md bg-dc-channels px-2 py-1 text-sm font-medium text-dc-channel-text hover:bg-dc-channel-hover"
                        >
                          <Pencil size={16} />
                          修改
                        </button>
                      )}
                    </>
                  )}
                  {editMode && (
                    <>
                      <button
                        type="button"
                        disabled={saveBusy}
                        onClick={() => void saveEdit()}
                        className="rounded-md bg-[#5865f2] px-3 py-1 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50"
                      >
                        {saveBusy ? '保存中…' : '保存'}
                      </button>
                      <button
                        type="button"
                        disabled={saveBusy}
                        onClick={cancelEdit}
                        className="rounded-md px-3 py-1 text-sm text-dc-channel-text hover:bg-dc-channel-hover"
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                {editMode ? (
                  <div className="space-y-2">
                    <p className="text-xs text-dc-channel-text">支持 Markdown（标题、列表、代码块、表格、链接等）</p>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={18}
                      maxLength={50000}
                      className="min-h-[320px] w-full resize-y rounded-md border border-black/25 bg-[#1e1f22] px-3 py-2 font-mono text-sm text-dc-channel-text-active focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                      placeholder="在此编辑 Markdown 正文…"
                    />
                  </div>
                ) : (
                  <ForumMarkdown markdown={detail.content} />
                )}
              </div>
              <div className="shrink-0 border-t border-black/20 bg-[#2b2d31]/50 px-6 py-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-dc-channel-text">
                  <MessageCircle size={14} />
                  留言 · {detail.comments.length}
                </div>
                <ul className="mb-4 max-h-48 space-y-3 overflow-y-auto">
                  {detail.comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-md border border-black/20 bg-[#1e1f22]/80 px-3 py-2"
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-dc-channel-text">
                        <span className="font-semibold text-dc-channel-text-active">
                          {c.user.username}
                        </span>
                        <span>{formatTime(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-dc-channel-text-active">
                        {c.content}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="写下留言…"
                    rows={2}
                    maxLength={4000}
                    className="min-h-[72px] flex-1 resize-y rounded-md border border-black/25 bg-[#1e1f22] px-3 py-2 text-sm text-dc-channel-text-active placeholder:text-dc-channel-text/50 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                  />
                  <button
                    type="button"
                    disabled={commentBusy || !commentText.trim()}
                    onClick={() => void handleSendComment()}
                    className="shrink-0 rounded-md bg-[#5865f2] px-4 py-2 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-40"
                  >
                    {commentBusy ? '发送中…' : '发表留言'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-dc-channel-text">
              <MessagesSquare size={40} className="opacity-40" strokeWidth={1.25} />
              <p className="text-lg font-medium text-dc-channel-text-active">选择一篇文章</p>
              <p className="max-w-sm text-sm">在左侧列表中选择帖子，在右侧阅读全文并参与留言、点赞。</p>
            </div>
          )}
        </div>

        {membersOpen && (
          <>
            <button
              type="button"
              aria-label="关闭成员列表"
              className="absolute inset-0 z-30 bg-black/40"
              onClick={() => setMembersOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 z-40 flex w-[min(100%,280px)] flex-col border-l border-black/20 bg-dc-channels shadow-2xl">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/20 px-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-dc-channel-text">
                  成员
                </span>
                <button
                  type="button"
                  onClick={() => setMembersOpen(false)}
                  className="rounded p-1.5 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
                  title="关闭"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ChannelMembers
                  channelId={channel.id}
                  userId={user.id}
                  isOwner={isOwner}
                  variant="embedded"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-t border-[#f23f43]/30 bg-[#f23f43]/10 px-4 py-2 text-center text-sm text-[#f23f43]">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>
            关闭
          </button>
        </div>
      )}

      {newOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-lg border border-black/30 bg-[#2b2d31] shadow-xl"
            role="dialog"
            aria-labelledby="forum-new-title"
          >
            <div className="flex items-center justify-between border-b border-black/20 px-4 py-3">
              <h2 id="forum-new-title" className="text-base font-semibold text-dc-channel-text-active">
                新建文章
              </h2>
              <button
                type="button"
                onClick={() => !newBusy && setNewOpen(false)}
                className="rounded p-1 text-dc-channel-text hover:bg-dc-channel-hover"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-dc-channel-text">标题</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  maxLength={200}
                  placeholder="文章标题"
                  className="w-full rounded-md border border-black/25 bg-[#1e1f22] px-3 py-2 text-sm text-dc-channel-text-active focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-dc-channel-text">
                  正文（支持 Markdown）
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={10}
                  maxLength={50000}
                  placeholder="正文内容… 可使用 Markdown"
                  className="w-full resize-y rounded-md border border-black/25 bg-[#1e1f22] px-3 py-2 font-mono text-sm text-dc-channel-text-active focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={newBusy}
                  onClick={() => setNewOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-dc-channel-text hover:bg-dc-channel-hover"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={newBusy || !newTitle.trim()}
                  onClick={() => void handleCreatePost()}
                  className="rounded-md bg-[#5865f2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-40"
                >
                  {newBusy ? '发布中…' : '发布'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {readerOpen && detail && !editMode && (
        <div className="fixed inset-0 z-[85] flex flex-col bg-[#1e1f22]">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
            <h2 className="min-w-0 truncate pr-4 text-lg font-semibold text-white">{detail.title}</h2>
            <button
              type="button"
              onClick={() => setReaderOpen(false)}
              className="flex shrink-0 items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              <X size={18} />
              关闭
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-16 md:py-10">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex flex-wrap gap-3 text-sm text-white/60">
                <span>{detail.author.username}</span>
                <span>发布于 {formatTime(detail.createdAt)}</span>
                {wasEdited(detail) && (
                  <span className="text-[#faa61a]">最后编辑 {formatTime(detail.updatedAt)}</span>
                )}
              </div>
              <ForumMarkdown markdown={detail.content} className="text-[17px] leading-[1.75]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
