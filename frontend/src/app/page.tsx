'use client';

import { useState, useEffect, useRef } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { StatusBar } from '@/components/layout/StatusBar';
import { ChannelList } from '@/components/channel/ChannelList';
import { ChannelMembers } from '@/components/channel/ChannelMembers';
import { MessageList, MessageListRef } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChannelSettingsModal } from '@/components/channel/ChannelSettingsModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { DatabaseManager } from '@/components/admin/DatabaseManager';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { Channel } from '@/types/channel.types';
import { createUser, validateUser } from '@/lib/authStorage';
import { Settings as SettingsIcon, X } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; username: string; email?: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDBManager, setShowDBManager] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfficialChannel, setIsOfficialChannel] = useState(false);
  const messageListRef = useRef<MessageListRef>(null);

  // 检查登录状态
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      const savedUserId = localStorage.getItem('userId');
      const savedUsername = localStorage.getItem('username');

      if (savedToken && savedUserId && savedUsername) {
        setUser({ id: savedUserId, username: savedUsername });
        setToken(savedToken);
        // 自动选择公共频道
        setSelectedChannel({
          id: 'public-official',
          name: '公共频道',
          type: 'PUBLIC' as any,
          description: '官方频道 - 所有用户自动加入',
          ownerId: 'system',
          participantCount: 0,
          hasPassword: false,
          requiresApproval: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setIsOfficialChannel(true);
      }
    } catch (err) {
      console.error('Failed to load auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      // 使用本地存储验证
      const user = validateUser(username, password);

      if (!user) {
        throw new Error('用户名或密码错误');
      }

      // 生成简单的token
      const token = `token-${user.id}-${Date.now()}`;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.username);
      localStorage.setItem('email', user.email);

      setUser({ id: user.id, username: user.username, email: user.email });
      setToken(token);

      // 自动选择公共频道
      setSelectedChannel({
        id: 'public-official',
        name: '公共频道',
        type: 'PUBLIC' as any,
        description: '官方频道 - 所有用户自动加入',
        ownerId: 'system',
        participantCount: 0,
        hasPassword: false,
        requiresApproval: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsOfficialChannel(true);

      setShowAuthModal(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    try {
      // 使用本地存储创建用户
      const newUser = createUser(username, email, password);

      // 生成简单的token
      const token = `token-${newUser.id}-${Date.now()}`;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', newUser.id);
      localStorage.setItem('username', newUser.username);
      localStorage.setItem('email', newUser.email);

      setUser({ id: newUser.id, username: newUser.username, email: newUser.email });
      setToken(token);

      // 自动选择公共频道
      setSelectedChannel({
        id: 'public-official',
        name: '公共频道',
        type: 'PUBLIC' as any,
        description: '官方频道 - 所有用户自动加入',
        ownerId: 'system',
        participantCount: 0,
        hasPassword: false,
        requiresApproval: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setIsOfficialChannel(true);

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
    setIsOfficialChannel(false);
    setError(null);
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    // 检查是否是官方公共频道
    setIsOfficialChannel(channel.id === 'public-official');
  };

  const handleLeaveChannel = () => {
    setSelectedChannel(null);
    setIsOfficialChannel(false);
  };

  const handleDeleteChannel = async (channelId: string) => {
    console.log('Deleting channel:', channelId);
    setSelectedChannel(null);
    setIsOfficialChannel(false);
    window.location.reload();
  };

  const handleUpdatePassword = async (channelId: string, newPassword: string) => {
    console.log('Updating password for channel:', channelId);
  };

  // 显示加载状态
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

  // 未登录状态
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
              onClose={() => {
                setShowAuthModal(false);
                setError(null);
              }}
              onLogin={handleLogin}
              onRegister={handleRegister}
            />
          )}
        </div>
      </div>
    );
  }

  const isOwner = selectedChannel?.ownerId === user.id;

  return (
    <WebSocketProvider userId={user.id} token={token || undefined}>
      <div className="flex h-screen flex-col bg-bg-primary">
        {/* 顶部导航 */}
        <TopBar
          username={user.username}
          onLogout={handleLogout}
          onOpenDBManager={() => setShowDBManager(true)}
        />

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧边栏 - 频道列表 */}
        <div className="w-60 bg-bg-secondary">
          <ChannelList
            userId={user.id}
            token={token || undefined}
            onChannelSelect={handleChannelSelect}
          />
        </div>

        {/* 中间 - 聊天区域 */}
        <div className="flex flex-1 flex-col">
          {selectedChannel ? (
            <>
              {/* 频道标题栏 */}
              <div className="flex h-12 items-center justify-between border-b border-border-color bg-bg-tertiary px-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {selectedChannel.type === 'PUBLIC' ? '#' : '🔒'}
                  </span>
                  <h2 className="font-semibold text-text-normal">
                    {selectedChannel.name}
                  </h2>
                  {selectedChannel.requiresApproval && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
                      需审核
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-normal"
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
                      const error = await response.json();
                      throw new Error(error.message || '发送失败');
                    }

                    const result = await response.json();

                    messageListRef.current?.replaceTemp(tempId, {
                      id: result.id,
                      channelId: result.channelId,
                      userId: result.userId,
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

        {/* 右侧边栏 - 频道成员 */}
        {selectedChannel && (
          <div className="w-60 bg-bg-secondary border-l border-border-color">
            <ChannelMembers
              channelId={selectedChannel.id}
              userId={user.id}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>

      {/* 底部状态栏 */}
      <StatusBar />

      {/* 频道设置模态框 */}
      {showSettings && selectedChannel && (
        <ChannelSettingsModal
          channel={selectedChannel}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onDelete={handleDeleteChannel}
          onUpdatePassword={handleUpdatePassword}
        />
      )}

      {/* 数据库管理模态框 */}
      {showDBManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b border-border-color sticky top-0 bg-bg-secondary">
              <h2 className="text-lg font-semibold text-text-normal">数据库管理</h2>
              <button
                onClick={() => setShowDBManager(false)}
                className="text-text-muted hover:text-text-normal transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-4">
              <DatabaseManager />
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-danger px-4 py-3 text-white shadow-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </WebSocketProvider>
  );
}
