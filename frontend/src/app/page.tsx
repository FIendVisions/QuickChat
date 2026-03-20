'use client';

import { useState, useEffect, useRef, useCallback, type DragEvent } from 'react';
import { StatusBar } from '@/components/layout/StatusBar';
import { UserSelfPanel } from '@/components/layout/UserSelfPanel';
import { ServerRail } from '@/components/server/ServerRail';
import { ServerChannelSidebar, type HomeSidebarView } from '@/components/channel/ServerChannelSidebar';
import { CreateServerModal } from '@/components/server/CreateServerModal';
import { JoinServerModal } from '@/components/server/JoinServerModal';
import { useServers } from '@/hooks/useServers';
import { MessageListRef } from '@/components/message/MessageList';
import { ChannelSettingsModal } from '@/components/channel/ChannelSettingsModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { LiveWatchProvider } from '@/contexts/LiveWatchContext';
import { ChatMainStack } from '@/components/chat/ChatMainStack';
import { Channel } from '@/types/channel.types';
import { serverApi } from '@/services/api/server.api';
import { channelApi } from '@/services/api/channel.api';
import { authApi } from '@/services/api/auth.api';
import { resolveUploadUrl } from '@/lib/mediaUrl';
import { mapChannelMessage, messageToReplyRef } from '@/lib/mapChannelMessage';
import { loadPersonalPins, togglePersonalPin } from '@/lib/pinnedMessages';
import { getApiOrigin } from '@/lib/serverOrigin';
import type { ChatMessage, SendMessagePayload } from '@/types/message.types';
import type { EveryonePin } from '@/types/pin.types';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string; email?: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreateServerModal, setShowCreateServerModal] = useState(false);
  const [showJoinServerModal, setShowJoinServerModal] = useState(false);
  const [homeMainView, setHomeMainView] = useState<HomeSidebarView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { servers, refetch: refetchServers } = useServers(user?.id);

  const messageListRef = useRef<MessageListRef>(null);
  const chatDragDepth = useRef(0);
  const [chatDragOver, setChatDragOver] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [personalPinIds, setPersonalPinIds] = useState<string[]>([]);
  const [everyonePins, setEveryonePins] = useState<EveryonePin[]>([]);

  const isOfficialChannel = false;
  const isOwner = selectedChannel?.ownerId === user?.id;

  const selectedServer = selectedServerId
    ? servers.find((s) => s.id === selectedServerId) ?? null
    : null;

  useEffect(() => {
    const onInvalid = (e: Event) => {
      const ce = e as CustomEvent<{ serverId?: string }>;
      const sid = ce.detail?.serverId;
      if (!sid) return;
      if (selectedServerId === sid) {
        setSelectedServerId(null);
      }
      setSelectedChannel((ch) => (ch?.serverId === sid ? null : ch));
    };
    window.addEventListener('quickchat:currentServerInvalid', onInvalid);
    return () => window.removeEventListener('quickchat:currentServerInvalid', onInvalid);
  }, [selectedServerId]);

  const sendChannelPayload = useCallback(
    async (payload: SendMessagePayload) => {
      if (!selectedChannel || !user) return;

      const tempId = `temp-${Date.now()}-${Math.random()}`;
      messageListRef.current?.addMessage({
        id: tempId,
        channelId: selectedChannel.id,
        userId: user.id,
        username: user.username,
        content: payload.content,
        type: (payload.type as any) || 'TEXT',
        createdAt: new Date().toISOString(),
        attachmentUrl: payload.attachmentUrl
          ? resolveUploadUrl(payload.attachmentUrl)
          : undefined,
        attachmentName: payload.attachmentName,
        attachmentMime: payload.attachmentMime,
        replyToId: payload.replyToId,
        replyTo: replyTo ? messageToReplyRef(replyTo) : null,
      });

      const response = await fetch(
        `${getApiOrigin()}/channels/${selectedChannel.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            content: payload.content,
            userId: user.id,
            username: user.username,
            type: payload.type,
            attachmentUrl: payload.attachmentUrl,
            attachmentName: payload.attachmentName,
            attachmentMime: payload.attachmentMime,
            replyToId: payload.replyToId,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || '发送失败');
      }

      const result = await response.json();
      const backendUserId = result.userId;
      if (backendUserId && backendUserId !== user.id) {
        localStorage.setItem('userId', backendUserId);
        setUser((prev) => (prev ? { ...prev, id: backendUserId } : prev));
      }

      messageListRef.current?.replaceTemp(tempId, mapChannelMessage(result));
    },
    [selectedChannel, user, token, replyTo],
  );

  const handleMessageSend = useCallback(
    async (payload: SendMessagePayload) => {
      await sendChannelPayload(payload);
      setReplyTo(null);
    },
    [sendChannelPayload],
  );

  const refreshEveryonePins = useCallback(async () => {
    if (!selectedChannel?.id) return;
    try {
      const { pins } = await channelApi.getPins(selectedChannel.id);
      setEveryonePins(Array.isArray(pins) ? pins : []);
    } catch {
      setEveryonePins([]);
    }
  }, [selectedChannel?.id]);

  useEffect(() => {
    if (selectedChannel?.id && user?.id) {
      setPersonalPinIds(loadPersonalPins(user.id, selectedChannel.id));
      void refreshEveryonePins();
    } else {
      setPersonalPinIds([]);
      setEveryonePins([]);
    }
  }, [selectedChannel?.id, user?.id, refreshEveryonePins]);

  useEffect(() => {
    setReplyTo(null);
  }, [selectedChannel?.id]);

  const handleTogglePersonalPin = useCallback(
    (messageId: string) => {
      if (!selectedChannel || !user) return;
      setPersonalPinIds(togglePersonalPin(user.id, selectedChannel.id, messageId));
    },
    [selectedChannel, user],
  );

  const handleToggleEveryonePin = useCallback(
    async (messageId: string) => {
      if (!selectedChannel || !user) return;
      try {
        const exists = everyonePins.some((p) => p.messageId === messageId);
        if (exists) {
          const { pins } = await channelApi.removeEveryonePin(selectedChannel.id, messageId, user.id);
          setEveryonePins(pins);
        } else {
          const { pins } = await channelApi.addEveryonePin(selectedChannel.id, messageId, user.id);
          setEveryonePins(pins);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '全员置顶操作失败');
      }
    },
    [selectedChannel, user, everyonePins],
  );

  const handleUnpinEveryone = useCallback(
    async (messageId: string) => {
      if (!selectedChannel || !user) return;
      try {
        const { pins } = await channelApi.removeEveryonePin(selectedChannel.id, messageId, user.id);
        setEveryonePins(pins);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '取消全员置顶失败');
      }
    },
    [selectedChannel, user],
  );

  useEffect(() => {
    chatDragDepth.current = 0;
    setChatDragOver(false);
  }, [selectedChannel?.id]);

  const handleChatDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types?.includes?.('Files')) return;
    chatDragDepth.current += 1;
    setChatDragOver(true);
  }, []);

  const handleChatDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    chatDragDepth.current -= 1;
    if (chatDragDepth.current <= 0) {
      chatDragDepth.current = 0;
      setChatDragOver(false);
    }
  }, []);

  const handleChatDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      chatDragDepth.current = 0;
      setChatDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !selectedChannel || !user) return;
      try {
        const uploaded = await channelApi.uploadAttachment(selectedChannel.id, file);
        const isImage = !!uploaded.mimeType?.startsWith('image/');
        await handleMessageSend({
          content: '',
          type: isImage ? 'IMAGE' : 'FILE',
          attachmentUrl: uploaded.url,
          attachmentName: uploaded.filename,
          attachmentMime: uploaded.mimeType,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '上传失败';
        setError(msg);
      }
    },
    [selectedChannel, user, handleMessageSend],
  );

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUserId = localStorage.getItem('userId');
      const savedUsername = localStorage.getItem('username');

      if (savedToken && savedUserId && savedUsername) {
        setUser({ id: savedUserId, username: savedUsername });
        setToken(savedToken);
        setSelectedChannel(null);
        setSelectedServerId(null);
        setHomeMainView(null);
      }
    } catch (err) {
      console.error('Failed to load auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const { access_token, user: u } = await authApi.login(username, password);
      localStorage.setItem('token', access_token);
      localStorage.setItem('userId', u.id);
      localStorage.setItem('username', u.username);
      if (u.email) localStorage.setItem('email', u.email);

      setUser({ id: u.id, username: u.username, email: u.email });
      setToken(access_token);
      setSelectedChannel(null);
      setSelectedServerId(null);
      setHomeMainView(null);
      setShowAuthModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      const { access_token, user: u } = await authApi.register(username, email, password);
      localStorage.setItem('token', access_token);
      localStorage.setItem('userId', u.id);
      localStorage.setItem('username', u.username);
      if (u.email) localStorage.setItem('email', u.email);

      setUser({ id: u.id, username: u.username, email: u.email });
      setToken(access_token);
      setSelectedChannel(null);
      setSelectedServerId(null);
      setHomeMainView(null);
      setShowAuthModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    setUser(null);
    setToken(null);
    setSelectedChannel(null);
    setSelectedServerId(null);
    setHomeMainView(null);
    setError(null);
  };

  const handleChannelSelect = async (channel: Channel) => {
    setHomeMainView(null);
    if (channel.serverId) {
      setSelectedServerId(channel.serverId);
    } else {
      setSelectedServerId(null);
    }
    try {
      const fresh = await channelApi.getById(channel.id);
      setSelectedChannel(fresh);
    } catch {
      setSelectedChannel(channel);
    }
  };

  const handleLeaveChannel = async () => {
    if (!selectedChannel) return;
    try {
      await channelApi.leave(selectedChannel.id);
    } catch (err) {
      // ignore if not a member
    }
    setSelectedChannel(null);
    window.dispatchEvent(new CustomEvent('channelsChanged'));
  };

  const handleDeleteChannel = async (channelId: string) => {
    setSelectedChannel(null);
    window.dispatchEvent(new CustomEvent('channelsChanged'));
  };

  const handleCreateServerSubmit = useCallback(
    async (data: { name: string; icon?: string }) => {
      if (!user) return;
      const created = await serverApi.create({
        name: data.name,
        icon: data.icon,
        userId: user.id,
        username: user.username,
      });
      await refetchServers();
      setSelectedServerId(created.id);
      setSelectedChannel(null);
    },
    [user, refetchServers],
  );

  const handleJoinServerSubmit = useCallback(
    async (inviteCode: string) => {
      if (!user) return;
      const joined = await serverApi.joinByInvite({
        inviteCode,
        userId: user.id,
        username: user.username,
      });
      await refetchServers();
      setSelectedServerId(joined.id);
      setSelectedChannel(null);
    },
    [user, refetchServers],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="mb-4 text-4xl animate-pulse">🎮</div>
          <p className="text-text-muted">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="mb-4 text-6xl">🎮</div>
          <h1 className="mb-2 text-3xl font-bold text-text-normal">QuickChat</h1>
          <p className="mb-8 text-text-muted">游戏语音开黑平台</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="rounded-lg bg-primary px-8 py-3 text-lg font-medium text-white hover:bg-primary/90"
          >
            开始使用
          </button>
          {showAuthModal && (
            <AuthModal
              onClose={() => { setShowAuthModal(false); setError(null); }}
              onLogin={handleLogin}
              onRegister={handleRegister}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <WebSocketProvider userId={user.id} token={token || undefined}>
      <LiveWatchProvider>
      <div className="flex h-screen flex-col bg-dc-chat">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ServerRail
            servers={servers}
            selectedServerId={selectedServerId}
            homeSelected={selectedServerId === null}
            onSelectHome={() => {
              setSelectedServerId(null);
              setSelectedChannel(null);
            }}
            onSelectServer={(s) => {
              setSelectedServerId(s.id);
              setHomeMainView(null);
              setSelectedChannel(null);
            }}
            onAddServer={() => setShowCreateServerModal(true)}
            onJoinServer={() => setShowJoinServerModal(true)}
          />

          <div className="flex w-[240px] min-h-0 min-w-0 shrink-0 flex-col border-r border-black/20 bg-dc-channels">
            <div className="min-h-0 flex-1 overflow-hidden">
              <ServerChannelSidebar
                userId={user.id}
                server={selectedServer}
                selectedChannelId={selectedChannel?.id}
                homeView={homeMainView}
                onHomeNavigate={(view) => {
                  setHomeMainView(view);
                  setSelectedChannel(null);
                }}
                onChannelSelect={handleChannelSelect}
              />
            </div>
            <UserSelfPanel
              username={user.username}
              email={user.email}
              channelId={selectedChannel?.id ?? null}
              userId={user.id}
              onLogout={handleLogout}
            />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-dc-chat">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {selectedChannel ? (
                <ChatMainStack
                  channel={selectedChannel}
                  user={user}
                  token={token}
                  isOwner={isOwner}
                  isOfficialChannel={isOfficialChannel}
                  messageListRef={messageListRef}
                  replyTo={replyTo}
                  setReplyTo={setReplyTo}
                  personalPinIds={personalPinIds}
                  everyonePins={everyonePins}
                  onTogglePersonalPin={handleTogglePersonalPin}
                  onToggleEveryonePin={handleToggleEveryonePin}
                  onUnpinEveryone={handleUnpinEveryone}
                  onEveryonePinsRefresh={refreshEveryonePins}
                  onMessageSend={handleMessageSend}
                  chatDragOver={chatDragOver}
                  onDragEnter={handleChatDragEnter}
                  onDragLeave={handleChatDragLeave}
                  onDragOverCapture={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.types?.includes?.('Files')) {
                      e.dataTransfer.dropEffect = 'copy';
                    }
                  }}
                  onDropCapture={(e) => {
                    void handleChatDrop(e);
                  }}
                  onLeaveChannel={handleLeaveChannel}
                  onOpenSettings={() => setShowSettings(true)}
                />
              ) : selectedServerId ? (
                <div className="flex flex-1 flex-col items-center justify-center bg-dc-chat px-6 text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-dc-channels text-4xl">
                    #
                  </div>
                  <p className="mb-1 text-2xl font-bold text-dc-channel-text-active">选择一个频道</p>
                  <p className="max-w-sm text-[15px] leading-relaxed text-dc-channel-text">
                    在左侧选择文字、语音或论坛频道，开始与服务器成员交流。
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center bg-dc-chat px-6 text-center">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-dc-channels text-4xl">
                    {homeMainView === 'dms' ? '✉️' : homeMainView === 'requests' ? '🔔' : homeMainView === 'friends' ? '👥' : '🏠'}
                  </div>
                  <p className="mb-1 text-2xl font-bold text-dc-channel-text-active">
                    {!homeMainView
                      ? '个人主页'
                      : homeMainView === 'friends'
                        ? '好友'
                        : homeMainView === 'requests'
                          ? '消息请求'
                          : '私信'}
                  </p>
                  <p className="max-w-sm text-[15px] leading-relaxed text-dc-channel-text">
                    {!homeMainView
                      ? '在左侧栏选择好友、消息请求或私信。'
                      : '此区域将用于好友列表、好友请求与私信会话，当前为占位界面。'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateServerModal && user && (
        <CreateServerModal
          onClose={() => setShowCreateServerModal(false)}
          onCreate={handleCreateServerSubmit}
        />
      )}
      {showJoinServerModal && user && (
        <JoinServerModal
          onClose={() => setShowJoinServerModal(false)}
          onJoin={handleJoinServerSubmit}
        />
      )}

      <StatusBar />

      {showSettings && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onDelete={handleDeleteChannel}
          onUpdated={(updated) => {
            setSelectedChannel(prev => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-danger px-4 py-3 text-white shadow-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-white hover:text-gray-200">✕</button>
        </div>
      )}
      </LiveWatchProvider>
    </WebSocketProvider>
  );
}
