'use client';

import { useState, useEffect, useRef } from 'react';
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
import { createUser, validateUser } from '@/lib/authStorage';

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

  const isOfficialChannel = selectedChannel?.id === 'public-official';
  const isOwner = selectedChannel?.ownerId === user?.id;

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
      const user = validateUser(username, password);
      if (!user) throw new Error('用户名或密码错误');

      const token = `token-${user.id}-${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username);
      localStorage.setItem('email', user.email);

      setUser({ id: user.id, username: user.username, email: user.email });
      setToken(token);
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
      const newUser = createUser(username, email, password);
      const token = `token-${newUser.id}-${Date.now()}`;
      localStorage.setItem('token', token);
      localStorage.setItem('userId', newUser.id);
      localStorage.setItem('username', newUser.username);
      localStorage.setItem('email', newUser.email);

      setUser({ id: newUser.id, username: newUser.username, email: newUser.email });
      setToken(token);
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
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col">
              {browsingPublicChannels ? (
                <PublicChannelBrowser
                  userId={user.id}
                  onChannelSelect={handleChannelSelect}
                />
              ) : selectedChannel ? (
                <>
                  {/* 频道标题栏 */}
                  <div className="flex h-12 items-center justify-between border-b border-border-color bg-bg-tertiary px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {selectedChannel.type === 'PUBLIC' ? '#' : '🔒'}
                      </span>
                      <h2 className="font-semibold text-text-normal">{selectedChannel.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && !isOfficialChannel && (
                        <button
                          onClick={() => setShowSettings(true)}
                          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-normal text-sm"
                        >
                          ⚙️
                        </button>
                      )}
                      {!isOfficialChannel && (
                        <button
                          onClick={handleLeaveChannel}
                          className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-text-muted hover:bg-bg-hover hover:text-text-normal"
                        >
                          🚪 退出
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 消息列表 */}
                  <div className="flex-1 overflow-y-auto">
                    <MessageList
                      ref={messageListRef}
                      channelId={selectedChannel.id}
                      userId={user.id}
                    />
                  </div>

                  {/* 消息输入 */}
                  <div className="border-t border-border-color bg-bg-tertiary p-4">
                    <MessageInput
                      channelId={selectedChannel.id}
                      currentUserId={user.id}
                      currentUsername={user.username}
                      onSend={async (content) => {
                        const tempId = `temp-${Date.now()}-${Math.random()}`;
                        messageListRef.current?.addMessage({
                          id: tempId,
                          channelId: selectedChannel.id,
                          userId: user.id,
                          username: user.username,
                          content,
                          type: 'TEXT',
                          createdAt: new Date().toISOString(),
                        });

                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/channels/${selectedChannel.id}/messages`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token && { 'Authorization': `Bearer ${token}` }),
                          },
                          body: JSON.stringify({
                            content,
                            userId: user.id,
                            username: user.username,
                          }),
                        });

                        if (!response.ok) {
                          const err = await response.json();
                          throw new Error(err.message || '发送失败');
                        }

                        const result = await response.json();
                        const backendUserId = result.userId;
                        if (backendUserId && backendUserId !== user.id) {
                          localStorage.setItem('userId', backendUserId);
                          setUser(prev => prev ? { ...prev, id: backendUserId } : prev);
                        }

                        messageListRef.current?.replaceTemp(tempId, {
                          id: result.id,
                          channelId: result.channelId,
                          userId: backendUserId || user.id,
                          username: result.user?.username || user.username,
                          avatar: result.user?.avatar,
                          content: result.content,
                          type: result.type || 'TEXT',
                          createdAt: result.createdAt,
                        });
                      }}
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

            {/* 右侧成员列表（嵌入聊天区内，紧凑宽度） */}
            {selectedChannel && !browsingPublicChannels && (
              <ChannelMembers
                channelId={selectedChannel.id}
                userId={user.id}
                isOwner={isOwner}
              />
            )}
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
