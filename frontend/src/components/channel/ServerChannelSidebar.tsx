'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useChannel } from '@/hooks/useChannel';
import { ChannelItem } from './ChannelItem';
import { CreateChannelModal } from './CreateChannelModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import { SimpleRenameModal } from './SimpleRenameModal';
import { Channel } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';
import { serverApi } from '@/services/api/server.api';
import type { ServerSummary, ServerCategory } from '@/types/server.types';
import { Plus, ChevronDown, ChevronRight, Copy, Check, LogOut, Trash2, Pencil } from 'lucide-react';

export type HomeSidebarView = 'friends' | 'requests' | 'dms';

interface ServerChannelSidebarProps {
  userId: string;
  server: ServerSummary | null;
  selectedChannelId?: string | null;
  homeView: HomeSidebarView | null;
  onHomeNavigate: (view: HomeSidebarView) => void;
  onChannelSelect: (channel: Channel) => void;
}

function groupChannelsByCategoryId(channels: Channel[]) {
  const map = new Map<string, Channel[]>();
  const uncategorized: Channel[] = [];
  for (const c of channels) {
    if (!c.categoryId) uncategorized.push(c);
    else {
      if (!map.has(c.categoryId)) map.set(c.categoryId, []);
      map.get(c.categoryId)!.push(c);
    }
  }
  return { map, uncategorized };
}

export function ServerChannelSidebar({
  userId,
  server,
  selectedChannelId,
  homeView,
  onHomeNavigate,
  onChannelSelect,
}: ServerChannelSidebarProps) {
  const homeMode = !server;
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  const { channels, isLoading } = useChannel(userId, {
    myOnly: true,
    serverId: server?.id ?? null,
  });

  const [categories, setCategories] = useState<ServerCategory[]>([]);
  const [createModal, setCreateModal] = useState<{ categoryId: string | null; key: number } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [renameModal, setRenameModal] = useState<
    | { mode: 'channel'; channel: Channel }
    | { mode: 'category'; category: ServerCategory }
    | { mode: 'newCategory' }
    | null
  >(null);

  const refreshCategories = useCallback(async () => {
    if (!server?.id) {
      setCategories([]);
      return;
    }
    try {
      const list = await serverApi.listCategories(server.id, userId);
      setCategories(list);
    } catch {
      setCategories([]);
    }
  }, [server?.id, userId]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    const onCh = () => void refreshCategories();
    window.addEventListener('channelsChanged', onCh);
    window.addEventListener('serversChanged', onCh);
    return () => {
      window.removeEventListener('channelsChanged', onCh);
      window.removeEventListener('serversChanged', onCh);
    };
  }, [refreshCategories]);

  const { map: channelsByCategory, uncategorized } = useMemo(
    () => groupChannelsByCategoryId(channels),
    [channels],
  );

  const isCatExpanded = (id: string) => expandedCats[id] !== false;
  const toggleCat = (id: string) =>
    setExpandedCats((p) => {
      const cur = p[id] !== false;
      return { ...p, [id]: !cur };
    });

  const openCreateInCategory = (categoryId: string | null) => {
    setCreateModal((prev) => ({
      categoryId,
      key: (prev?.key ?? 0) + 1,
    }));
  };

  const handleChannelClick = async (channel: Channel) => {
    setError(null);
    try {
      await channelApi.join(channel.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('password') || msg.includes('密码')) {
        if (channel.hasPassword) {
          setSelectedChannel(channel);
          setShowPasswordModal(true);
          return;
        }
      }
    }
    onChannelSelect(channel);
  };

  const handleCreateChannel = async (data: {
    name: string;
    type: 'public' | 'private';
    kind: 'TEXT' | 'VOICE' | 'FORUM';
    categoryId?: string;
    description?: string;
    password?: string;
  }) => {
    const username = localStorage.getItem('username') || '';
    await channelApi.create({
      name: data.name,
      type: data.type.toUpperCase() as 'PUBLIC' | 'PRIVATE',
      kind: data.kind,
      serverId: server?.id,
      categoryId: data.categoryId,
      description: data.description,
      password: data.password,
      userId,
      username,
    });
    window.dispatchEvent(new CustomEvent('channelsChanged'));
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedChannel) return;
    await channelApi.join(selectedChannel.id, password);
    onChannelSelect(selectedChannel);
    setShowPasswordModal(false);
    setSelectedChannel(null);
    window.dispatchEvent(new CustomEvent('channelsChanged'));
  };

  const copyInvite = async () => {
    if (!server?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(server.inviteCode);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setError('无法复制邀请码');
    }
  };

  const handleLeaveServer = async () => {
    if (!server) return;
    try {
      await serverApi.leave(server.id, userId);
      window.dispatchEvent(new CustomEvent('quickchat:currentServerInvalid', { detail: { serverId: server.id } }));
      window.dispatchEvent(new CustomEvent('serversChanged'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '退出失败');
    }
  };

  const handleDeleteServer = async () => {
    if (!server) return;
    if (!window.confirm(`确定删除服务器「${server.name}」？其下所有频道将被删除。`)) return;
    try {
      await serverApi.deleteServer(server.id, userId);
      window.dispatchEvent(new CustomEvent('quickchat:currentServerInvalid', { detail: { serverId: server.id } }));
      window.dispatchEvent(new CustomEvent('serversChanged'));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const isServerOwner = server && server.ownerId === userId;

  const canEditChannel = (ch: Channel) =>
    !!server && (isServerOwner || ch.ownerId === userId);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!serverMenuRef.current?.contains(e.target as Node)) setServerMenuOpen(false);
    };
    if (serverMenuOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [serverMenuOpen]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-3">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 rounded bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-dc-channels">
        {homeMode ? (
          <div className="flex h-12 shrink-0 items-center border-b border-black/20 px-4 shadow-dc-header">
            <h2 className="truncate text-base font-semibold text-dc-channel-text-active">QuickChat</h2>
          </div>
        ) : (
          <div ref={serverMenuRef} className="relative shrink-0 border-b border-black/20 shadow-dc-header">
            <button
              type="button"
              onClick={() => setServerMenuOpen((o) => !o)}
              className="flex h-12 w-full items-center justify-between gap-2 px-4 text-left transition-colors hover:bg-dc-channel-hover"
            >
              <span className="truncate text-base font-semibold text-dc-channel-text-active">{server!.name}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-dc-channel-text transition-transform ${serverMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {serverMenuOpen && server && (
              <div className="absolute left-2 right-2 top-[calc(100%+4px)] z-40 rounded-md border border-black/30 bg-[#111214] py-1 shadow-xl">
                {isServerOwner && (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dc-channel-text-active hover:bg-[#5865f2] hover:text-white"
                      onClick={() => {
                        void copyInvite();
                        setServerMenuOpen(false);
                      }}
                    >
                      {inviteCopied ? <Check size={16} /> : <Copy size={16} />}
                      复制邀请码
                    </button>
                    <div className="my-1 h-px bg-white/5" />
                  </>
                )}
                {!isServerOwner && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dc-channel-text-active hover:bg-dc-channel-hover"
                    onClick={() => {
                      setServerMenuOpen(false);
                      void handleLeaveServer();
                    }}
                  >
                    <LogOut size={16} />
                    退出服务器
                  </button>
                )}
                {isServerOwner && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#f23f43] hover:bg-[#f23f43]/10"
                    onClick={() => {
                      setServerMenuOpen(false);
                      void handleDeleteServer();
                    }}
                  >
                    <Trash2 size={16} />
                    删除服务器
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto py-2">
          {homeMode && (
            <>
              <nav className="space-y-0.5 px-2 pb-1">
                {(
                  [
                    { key: 'friends' as const, label: '好友' },
                    { key: 'requests' as const, label: '消息请求' },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onHomeNavigate(key)}
                    className={`flex w-full rounded-[4px] px-2 py-2 text-left text-sm font-medium transition-colors ${
                      homeView === key
                        ? 'bg-dc-channel-active text-dc-channel-text-active'
                        : 'text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className="my-2 mx-2 h-px bg-black/25" />
                <button
                  type="button"
                  onClick={() => onHomeNavigate('dms')}
                  className={`flex w-full rounded-[4px] px-2 py-2 text-left text-sm font-medium transition-colors ${
                    homeView === 'dms'
                      ? 'bg-dc-channel-active text-dc-channel-text-active'
                      : 'text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active'
                  }`}
                >
                  私信
                </button>
              </nav>
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-dc-channel-text">
                  {homeView
                    ? `当前：${homeView === 'friends' ? '好友' : homeView === 'requests' ? '消息请求' : '私信'}（功能开发中）`
                    : '在上方选择好友、消息请求或私信'}
                </p>
              </div>
            </>
          )}

          {!homeMode && server && (
            <>
              {isServerOwner && (
                <div className="space-y-0.5 px-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setRenameModal({ mode: 'newCategory' })}
                    className="flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-sm text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
                  >
                    <Plus size={18} strokeWidth={2} />
                    新建分组
                  </button>
                </div>
              )}

              {categories.map((cat) => {
                const list = channelsByCategory.get(cat.id) ?? [];
                const exp = isCatExpanded(cat.id);
                return (
                  <div key={cat.id}>
                    <div className="group/cat mt-3 flex w-full items-center gap-0.5 px-2 pb-1 pt-1 first:mt-0">
                      <button
                        type="button"
                        onClick={() => toggleCat(cat.id)}
                        className="flex min-w-0 flex-1 items-center gap-0.5 text-left hover:text-dc-channel-text-active"
                      >
                        {exp ? (
                          <ChevronDown size={14} className="shrink-0 text-dc-channel-text" />
                        ) : (
                          <ChevronRight size={14} className="shrink-0 text-dc-channel-text" />
                        )}
                        <span className="truncate text-xs font-semibold uppercase tracking-[0.02em] text-dc-channel-text">
                          {cat.name}
                        </span>
                        <span className="ml-auto rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-dc-channel-text">
                          {list.length}
                        </span>
                      </button>
                      {isServerOwner && (
                        <button
                          type="button"
                          title="重命名分组"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameModal({ mode: 'category', category: cat });
                          }}
                          className="shrink-0 rounded p-1 text-dc-channel-text opacity-0 transition-opacity hover:bg-dc-channel-hover hover:text-dc-channel-text-active group-hover/cat:opacity-100"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="在此分组新建频道"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateInCategory(cat.id);
                        }}
                        className="shrink-0 rounded p-1 text-dc-channel-text opacity-0 transition-opacity hover:bg-dc-channel-hover hover:text-dc-channel-text-active group-hover/cat:opacity-100"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                    {exp && (
                      <div className="space-y-0.5">
                        {list.length > 0 ? (
                          list.map((ch) => (
                            <ChannelItem
                              key={ch.id}
                              channel={ch}
                              onClick={handleChannelClick}
                              showTypeBadge
                              dark
                              selected={selectedChannelId === ch.id}
                              canEdit={canEditChannel(ch)}
                              onEdit={
                                canEditChannel(ch)
                                  ? () => setRenameModal({ mode: 'channel', channel: ch })
                                  : undefined
                              }
                              onAddChannelInGroup={(ch) =>
                                openCreateInCategory(ch.categoryId ?? cat.id)
                              }
                            />
                          ))
                        ) : (
                          <p className="px-4 py-1 text-[11px] text-dc-channel-text">暂无频道</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {uncategorized.length > 0 && (
                <>
                  <div className="group/cat mt-3 flex w-full items-center gap-0.5 px-2 pb-1 pt-1">
                    <button
                      type="button"
                      onClick={() => toggleCat('_ungrouped')}
                      className="flex min-w-0 flex-1 items-center gap-0.5 text-left hover:text-dc-channel-text-active"
                    >
                      {isCatExpanded('_ungrouped') ? (
                        <ChevronDown size={14} className="shrink-0 text-dc-channel-text" />
                      ) : (
                        <ChevronRight size={14} className="shrink-0 text-dc-channel-text" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-[0.02em] text-dc-channel-text">
                        未分组
                      </span>
                    </button>
                    <button
                      type="button"
                      title="在未分组下新建频道"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateInCategory(null);
                      }}
                      className="shrink-0 rounded p-1 text-dc-channel-text opacity-0 transition-opacity hover:bg-dc-channel-hover hover:text-dc-channel-text-active group-hover/cat:opacity-100"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                  {isCatExpanded('_ungrouped') && (
                    <div className="space-y-0.5">
                      {uncategorized.map((ch) => (
                        <ChannelItem
                          key={ch.id}
                          channel={ch}
                          onClick={handleChannelClick}
                          showTypeBadge
                          dark
                          selected={selectedChannelId === ch.id}
                          canEdit={canEditChannel(ch)}
                          onEdit={
                            canEditChannel(ch)
                              ? () => setRenameModal({ mode: 'channel', channel: ch })
                              : undefined
                          }
                          onAddChannelInGroup={() => openCreateInCategory(null)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="mx-2 mb-2 rounded border border-[#f23f43]/40 bg-[#f23f43]/10 p-2 text-xs text-[#f23f43]">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">
              关闭
            </button>
          </div>
        )}
      </div>

      {createModal && server && (
        <CreateChannelModal
          key={createModal.key}
          requireServer
          serverId={server.id}
          targetCategoryId={createModal.categoryId}
          onClose={() => {
            setCreateModal(null);
            setError(null);
          }}
          onCreate={handleCreateChannel}
        />
      )}
      {showPasswordModal && selectedChannel && (
        <PasswordPromptModal
          channelName={selectedChannel.name}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedChannel(null);
            setError(null);
          }}
          onSubmit={handlePasswordSubmit}
        />
      )}
      {renameModal?.mode === 'channel' && (
        <SimpleRenameModal
          title="重命名频道"
          initialValue={renameModal.channel.name}
          onClose={() => setRenameModal(null)}
          onConfirm={async (name) => {
            await channelApi.update(renameModal.channel.id, { name });
            window.dispatchEvent(new CustomEvent('channelsChanged'));
          }}
        />
      )}
      {renameModal?.mode === 'category' && server && (
        <SimpleRenameModal
          title="重命名分组"
          initialValue={renameModal.category.name}
          onClose={() => setRenameModal(null)}
          onConfirm={async (name) => {
            await serverApi.updateCategory(server.id, renameModal.category.id, userId, name);
            await refreshCategories();
            window.dispatchEvent(new CustomEvent('channelsChanged'));
          }}
        />
      )}
      {renameModal?.mode === 'newCategory' && server && (
        <SimpleRenameModal
          title="新建分组"
          initialValue=""
          placeholder="分组名称"
          confirmLabel="创建"
          onClose={() => setRenameModal(null)}
          onConfirm={async (name) => {
            await serverApi.createCategory(server.id, userId, name);
            await refreshCategories();
          }}
        />
      )}
    </>
  );
}
