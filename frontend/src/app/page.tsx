'use client';

import { useState, useEffect, useRef, useCallback, type DragEvent } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { ChannelList } from '@/components/channel/ChannelList';
import { ChannelMembers } from '@/components/channel/ChannelMembers';
import { MessageList, MessageListRef } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChannelSettingsModal } from '@/components/channel/ChannelSettingsModal';
import { PublicChannelBrowser } from '@/components/channel/PublicChannelBrowser';
import { AuthModal } from '@/components/auth/AuthModal';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { Channel } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';
import { authApi } from '@/services/api/auth.api';
import { resolveUploadUrl } from '@/lib/mediaUrl';
import { loadChannelPins, toggleChannelPin } from '@/lib/pinnedMessages';
import type { ChatMessage, SendMessagePayload } from '@/types/message.types';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string; email?: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [browsingPublicChannels, setBrowsingPublicChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<MessageListRef>(null);
  const chatDragDepth = useRef(0);
  const [chatDragOver, setChatDragOver] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const isOfficialChannel = selectedChannel?.id === 'public-official';
  const isOwner = selectedChannel?.ownerId === user?.id;

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
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/${selectedChannel.id}/messages`,
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

      messageListRef.current?.replaceTemp(tempId, {
        id: result.id,
        channelId: result.channelId,
        userId: backendUserId || user.id,
        username: result.user?.username || user.username,
        avatar: result.user?.avatar,
        content: result.content ?? '',
        type: result.type || 'TEXT',
        createdAt: result.createdAt,
        attachmentUrl: result.attachmentUrl
          ? resolveUploadUrl(result.attachmentUrl)
          : undefined,
        attachmentName: result.attachmentName,
        attachmentMime: result.attachmentMime,
      });
    },
    [selectedChannel, user, token],
  );

  const handleMessageSend = useCallback(
    async (payload: SendMessagePayload) => {
      await sendChannelPayload(payload);
      setReplyTo(null);
    },
    [sendChannelPayload],
  );

  useEffect(() => {
    if (selectedChannel?.id) {
      setPinnedIds(loadChannelPins(selectedChannel.id));
    } else {
      setPinnedIds([]);
    }
  }, [selectedChannel?.id]);

  useEffect(() => {
    setReplyTo(null);
  }, [selectedChannel?.id]);

  const handleTogglePin = useCallback(
    (messageId: string) => {
      if (!selectedChannel) return;
      setPinnedIds(toggleChannelPin(selectedChannel.id, messageId));
    },
    [selectedChannel],
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
        setSelectedChannel({
          id: 'public-official',
          name: '公共频道',
          type: 'PUBLIC' as any,
          description: '官方频道 - 所有用户自动加入',
          ownerId: 'system',
          participantCount: 0,
          hasPassword: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
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
      setSelectedChannel({
        id: 'public-official', name: '公共频道', type: 'PUBLIC' as any,
        description: '官方频道', ownerId: 'system', participantCount: 0,
        hasPassword: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
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
      setSelectedChannel({
        id: 'public-official', name: '公共频道', type: 'PUBLIC' as any,
        description: '官方频道', ownerId: 'system', participantCount: 0,
        hasPassword: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
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
    setBrowsingPublicChannels(false);
    setError(null);
  };

  const handleChannelSelect = async (channel: Channel) => {
    setBrowsingPublicChannels(false);
    if (channel.id === 'public-official') {
      setSelectedChannel(channel);
      return;
    }
    try {
      const fresh = await channelApi.getById(channel.id);
      setSelectedChannel(fresh);
    } catch {
      setSelectedChannel(channel);
    }
  };

  const handleLeaveChannel = async () => {
    if (!selectedChannel || selectedChannel.id === 'public-official') return;
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
      <div className="flex h-screen flex-col bg-bg-primary">
        <TopBar
          username={user.username}
          onLogout={handleLogout}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧边栏 */}
          <div className="w-60 bg-bg-secondary">
            <ChannelList
              userId={user.id}
              token={token || undefined}
              onChannelSelect={handleChannelSelect}
              onBrowsePublicChannels={() => {
                setBrowsingPublicChannels(true);
                setSelectedChannel(null);
              }}
            />
          </div>

          {/* 中间+右侧区域 */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col">
              {browsingPublicChannels ? (
                <PublicChannelBrowser
                  userId={user.id}
                  onChannelSelect={handleChannelSelect}
                />
              ) : selectedChannel ? (
                <>
                  {/* Discord 式：标题栏横跨消息区+成员区整宽 */}
                  <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-color bg-bg-tertiary px-4 shadow-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-base text-text-muted">
                        {selectedChannel.type === 'PUBLIC' ? '#' : '🔒'}
                      </span>
                      <h2 className="truncate text-sm font-semibold text-text-normal">{selectedChannel.name}</h2>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {isOwner && !isOfficialChannel && (
                        <button
                          type="button"
                          onClick={() => setShowSettings(true)}
                          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-normal text-sm"
                        >
                          ⚙️
                        </button>
                      )}
                      {!isOfficialChannel && (
                        <button
                          type="button"
                          onClick={handleLeaveChannel}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-muted hover:bg-bg-hover hover:text-text-normal"
                        >
                          🚪 退出
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 消息区 + 成员区同高，输入框仅在左侧（Discord 布局） */}
                  <div className="flex min-h-0 flex-1 overflow-hidden">
                    <div
                      className={`relative flex min-h-0 min-w-0 flex-1 flex-col ${chatDragOver ? 'ring-2 ring-inset ring-primary' : ''}`}
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
                    >
                      {chatDragOver && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/15 text-sm font-medium text-text-normal backdrop-blur-[1px]">
                          松开鼠标发送文件
                        </div>
                      )}
                      <div className="min-h-0 flex-1 overflow-y-auto">
                        <MessageList
                          ref={messageListRef}
                          channelId={selectedChannel.id}
                          userId={user.id}
                          onReply={setReplyTo}
                          pinnedIds={pinnedIds}
                          onTogglePin={handleTogglePin}
                        />
                      </div>
                      <div className="shrink-0 border-t border-border-color bg-bg-tertiary px-3 py-2">
                        <MessageInput
                          channelId={selectedChannel.id}
                          currentUserId={user.id}
                          currentUsername={user.username}
                          replyTo={replyTo}
                          onCancelReply={() => setReplyTo(null)}
                          onSend={handleMessageSend}
                        />
                      </div>
                    </div>

                    <ChannelMembers
                      channelId={selectedChannel.id}
                      userId={user.id}
                      isOwner={isOwner}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-4 text-5xl">💬</div>
                  <p className="mb-2 text-lg text-text-normal">选择一个频道开始聊天</p>
                  <p className="text-sm text-text-muted">从左侧列表中选择频道</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </WebSocketProvider>
  );
}
