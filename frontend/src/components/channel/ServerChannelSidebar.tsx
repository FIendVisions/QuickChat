'use client';

import { useState, useMemo } from 'react';
import { useChannel } from '@/hooks/useChannel';
import { ChannelItem } from './ChannelItem';
import { CreateChannelModal } from './CreateChannelModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import { JoinChannelModal } from './JoinChannelModal';
import { Channel, ChannelType, ChannelKind } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';
import { serverApi } from '@/services/api/server.api';
import type { ServerSummary } from '@/types/server.types';
import { Plus, LogIn, ChevronDown, ChevronRight, Globe, Copy, Check, LogOut, Trash2 } from 'lucide-react';

const OFFICIAL_CHANNEL: Channel = {
  id: 'public-official',
  name: '公共频道',
  type: ChannelType.PUBLIC,
  kind: ChannelKind.TEXT,
  description: '官方频道 - 所有用户自动加入',
  ownerId: 'system',
  participantCount: 0,
  hasPassword: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface ServerChannelSidebarProps {
  userId: string;
  server: ServerSummary | null;
  onChannelSelect: (channel: Channel) => void;
  onBrowsePublic: () => void;
}

function groupByKind(list: Channel[]) {
  const text: Channel[] = [];
  const voice: Channel[] = [];
  const live: Channel[] = [];
  for (const c of list) {
    const k = c.kind ?? ChannelKind.TEXT;
    if (k === ChannelKind.VOICE) voice.push(c);
    else if (k === ChannelKind.LIVE) live.push(c);
    else text.push(c);
  }
  return { text, voice, live };
}

export function ServerChannelSidebar({
  userId,
  server,
  onChannelSelect,
  onBrowsePublic,
}: ServerChannelSidebarProps) {
  const homeMode = !server;
  const { channels, isLoading } = useChannel(userId, {
    myOnly: true,
    serverId: server?.id ?? null,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [officialExpanded, setOfficialExpanded] = useState(true);
  const [legacyExpanded, setLegacyExpanded] = useState(true);
  const [textExpanded, setTextExpanded] = useState(true);
  const [voiceExpanded, setVoiceExpanded] = useState(true);
  const [liveExpanded, setLiveExpanded] = useState(true);

  const officialFromApi = channels.find((ch) => ch.id === 'public-official');
  const officialChannel: Channel = officialFromApi || OFFICIAL_CHANNEL;

  const legacyChannels = useMemo(
    () => channels.filter((ch) => ch.id !== 'public-official'),
    [channels],
  );

  const serverChannels = useMemo(() => groupByKind(legacyChannels), [legacyChannels]);

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
    kind: 'TEXT' | 'VOICE' | 'LIVE';
    description?: string;
    password?: string;
  }) => {
    const username = localStorage.getItem('username') || '';
    await channelApi.create({
      name: data.name,
      type: data.type.toUpperCase() as 'PUBLIC' | 'PRIVATE',
      kind: data.kind,
      serverId: server?.id,
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

  const handleJoinByChannelId = async (channelId: string) => {
    const channel = await channelApi.getById(channelId);
    window.dispatchEvent(new CustomEvent('channelsChanged'));
    onChannelSelect(channel);
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
      <div className="flex h-full min-h-0 flex-col bg-[#2b2d31] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex h-12 shrink-0 items-center border-b border-black/20 px-4 shadow-sm">
          <h2 className="truncate text-sm font-semibold text-white">
            {homeMode ? '主页' : server.name}
          </h2>
        </div>

        {!homeMode && server && (
          <div className="shrink-0 space-y-2 border-b border-black/20 px-3 py-2">
            {isServerOwner && (
              <div className="flex items-center gap-2 rounded bg-black/20 px-2 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">邀请码</span>
                <code className="flex-1 truncate font-mono text-xs text-white/90">{server.inviteCode}</code>
                <button
                  type="button"
                  onClick={() => void copyInvite()}
                  className="shrink-0 rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  title="复制"
                >
                  {inviteCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
            <div className="flex gap-1">
              {!isServerOwner && (
                <button
                  type="button"
                  onClick={() => void handleLeaveServer()}
                  className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={12} />
                  退出服务器
                </button>
              )}
              {isServerOwner && (
                <button
                  type="button"
                  onClick={() => void handleDeleteServer()}
                  className="flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={12} />
                  删除服务器
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1 p-1">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              <Plus size={16} className="text-white/70" />
              创建频道
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-white/60 hover:bg-white/10 hover:text-white/90"
            >
              <LogIn size={16} />
              通过 ID 加入频道
            </button>
          </div>

          {homeMode && (
            <>
              <SectionHeader
                title="官方"
                expanded={officialExpanded}
                onToggle={() => setOfficialExpanded(!officialExpanded)}
                dark
              />
              {officialExpanded && (
                <div className="ml-1 space-y-0.5">
                  <ChannelItem channel={officialChannel} onClick={handleChannelClick} dark />
                </div>
              )}
              <button
                type="button"
                onClick={onBrowsePublic}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white/90"
              >
                <Globe size={16} className="text-emerald-400" />
                <span className="font-medium">公开频道</span>
                <ChevronRight size={14} className="ml-auto opacity-60" />
              </button>
              <SectionHeader
                title="未归属服务器的频道"
                count={legacyChannels.length}
                expanded={legacyExpanded}
                onToggle={() => setLegacyExpanded(!legacyExpanded)}
                dark
              />
              {legacyExpanded && (
                <div className="ml-1 space-y-0.5">
                  {legacyChannels.length > 0 ? (
                    legacyChannels.map((ch) => (
                      <ChannelItem key={ch.id} channel={ch} onClick={handleChannelClick} showTypeBadge dark />
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-white/40">创建服务器后，可在服务器内新建频道</p>
                  )}
                </div>
              )}
            </>
          )}

          {!homeMode && (
            <>
              <ChannelGroup
                title="文字频道"
                expanded={textExpanded}
                onToggle={() => setTextExpanded(!textExpanded)}
                channels={serverChannels.text}
                onChannelClick={handleChannelClick}
                dark
              />
              <ChannelGroup
                title="语音频道"
                expanded={voiceExpanded}
                onToggle={() => setVoiceExpanded(!voiceExpanded)}
                channels={serverChannels.voice}
                onChannelClick={handleChannelClick}
                dark
              />
              <ChannelGroup
                title="直播频道"
                expanded={liveExpanded}
                onToggle={() => setLiveExpanded(!liveExpanded)}
                channels={serverChannels.live}
                onChannelClick={handleChannelClick}
                dark
              />
            </>
          )}
        </div>

        {error && (
          <div className="mx-2 mb-2 rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">
              关闭
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChannelModal
          requireServer={!homeMode}
          serverId={server?.id}
          onClose={() => {
            setShowCreateModal(false);
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
      {showJoinModal && (
        <JoinChannelModal
          onClose={() => {
            setShowJoinModal(false);
            setError(null);
          }}
          onJoin={handleJoinByChannelId}
          currentUserId={userId}
        />
      )}
    </>
  );
}

function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  dark,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  dark?: boolean;
}) {
  const muted = dark ? 'text-white/45 hover:text-white/80' : 'text-text-muted hover:text-text-normal';
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`mt-2 flex w-full items-center gap-1 px-1 py-1 text-xs font-semibold uppercase tracking-wide first:mt-0 ${muted}`}
    >
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span>{title}</span>
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
      )}
    </button>
  );
}

function ChannelGroup({
  title,
  channels,
  expanded,
  onToggle,
  onChannelClick,
  dark,
}: {
  title: string;
  channels: Channel[];
  expanded: boolean;
  onToggle: () => void;
  onChannelClick: (c: Channel) => void;
  dark?: boolean;
}) {
  return (
    <>
      <SectionHeader title={title} expanded={expanded} onToggle={onToggle} dark={dark} />
      {expanded && (
        <div className="ml-1 space-y-0.5">
          {channels.length > 0 ? (
            channels.map((ch) => (
              <ChannelItem key={ch.id} channel={ch} onClick={onChannelClick} showTypeBadge dark={dark} />
            ))
          ) : (
            <p className="px-3 py-1 text-[11px] text-white/35">暂无</p>
          )}
        </div>
      )}
    </>
  );
}
