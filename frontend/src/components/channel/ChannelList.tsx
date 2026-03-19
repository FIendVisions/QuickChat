// frontend/src/components/channel/ChannelList.tsx

'use client';

import { useState, useEffect } from 'react';
import { ChannelType } from '@/types/channel.types';
import { useChannel } from '@/hooks/useChannel';
import { ChannelItem } from './ChannelItem';
import { CreateChannelModal } from './CreateChannelModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import { JoinChannelModal } from './JoinChannelModal';
import { Channel } from '@/types/channel.types';
import { verifyChannelPassword, loadAllChannels } from '@/lib/dbHelpers';
import { channelApi } from '@/services/api/channel.api';

interface ChannelListProps {
  userId: string;
  token?: string;
  onChannelSelect?: (channel: Channel) => void;
}

/**
 * 频道列表组件
 * 展示所有频道，按类型分组
 */
export function ChannelList({ userId, token, onChannelSelect }: ChannelListProps) {
  const { publicChannels, privateChannels, isLoading, refetch } = useChannel();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 调试：打印所有 localStorage 内容
  useEffect(() => {
    const checkDB = async () => {
      try {
        const channels = await loadAllChannels();
        console.log('=== Debug: All channels in DB ===');
        channels.forEach(ch => {
          console.log(`- ${ch.name} (${ch.id}) [${ch.type}]`);
          if (ch.inviteCode) {
            console.log(`  Invite Code: ${ch.inviteCode}`);
          }
        });

        const inviteKeys = Object.keys(localStorage).filter(k => k.startsWith('channel_invite_'));
        console.log('Old invite code mappings in localStorage:', inviteKeys);
      } catch (err) {
        console.error('Error checking DB:', err);
      }
    };

    checkDB();
  }, []);

  /**
   * 处理频道点击
   */
  const handleChannelClick = async (channel: Channel) => {
    setError(null);

    try {
      // 官方公共频道直接选择
      if (channel.id === 'public-official') {
        onChannelSelect?.(channel);
        return;
      }

      // 先尝试加入频道（无论公开还是私密）
      console.log('🔄 加入频道:', channel.name);
      await channelApi.join(channel.id);

      // 加入成功后选择频道
      onChannelSelect?.(channel);
      console.log('✅ 成功加入频道:', channel.name);

    } catch (error: any) {
      console.error('❌ 加入频道失败:', error);

      // 如果是密码错误，显示密码输入框
      if (error.message && error.message.includes('密码')) {
        if (channel.hasPassword) {
          setSelectedChannel(channel);
          setShowPasswordModal(true);
        }
      } else {
        // 其他错误也尝试选择频道（可能是已经加入了）
        console.log('⚠️ 尝试直接选择频道');
        onChannelSelect?.(channel);
      }
    }
  };

  /**
   * 处理创建频道
   */
  const handleCreateChannel = async (data: {
    name: string;
    type: 'public' | 'private';
    description?: string;
    password?: string;
    requiresApproval?: boolean;
  }) => {
    try {
      console.log('Creating channel with data:', data);
      setError(null);

      const newChannel = await channelApi.create({
        name: data.name,
        type: data.type.toUpperCase() as 'PUBLIC' | 'PRIVATE',
        description: data.description,
        password: data.password,
      });

      console.log('Channel created successfully:', newChannel);

      // 触发频道列表刷新
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      setError(err.message || '创建频道失败');
      throw err;
    }
  };

  /**
   * 处理密码提交
   */
  const handlePasswordSubmit = async (password: string) => {
    if (!selectedChannel) return;

    try {
      setError(null);

      const isValid = verifyChannelPassword(selectedChannel.id, password);

      if (!isValid) {
        throw new Error('密码错误');
      }

      onChannelSelect?.(selectedChannel);
      setShowPasswordModal(false);
      setSelectedChannel(null);
    } catch (err: any) {
      setError(err.message || '加入频道失败');
      throw err;
    }
  };

  /**
   * 通过频道ID加入频道
   */
  const handleJoinByInviteCode = async (channelId: string) => {
    try {
      // 从后端 API 获取频道信息
      const channel = await channelApi.getById(channelId);

      if (channel) {
        onChannelSelect?.(channel);
      } else {
        setError('频道不存在');
      }
    } catch (err: any) {
      console.error('Failed to join channel:', err);
      setError(err.message || '加入频道失败');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-2">
        {/* 加载骨架屏 */}
        <div className="animate-pulse">
          <div className="mb-2 h-4 w-20 rounded bg-bg-secondary" />
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-bg-floating" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 p-2">
        {/* 创建频道和加入频道按钮 */}
        <div className="space-y-1">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-muted hover:text-text-normal transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建频道
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-muted hover:text-text-normal transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            加入频道
          </button>
        </div>

        {/* 公共频道 */}
        {publicChannels.length > 0 && (
          <section>
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-text-muted">
              公共频道
            </h3>
            <div className="space-y-0.5">
              {publicChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  onClick={handleChannelClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* 私有频道 */}
        {privateChannels.length > 0 && (
          <section>
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-text-muted">
              私有频道
            </h3>
            <div className="space-y-0.5">
              {privateChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  onClick={handleChannelClick}
                />
              ))}
            </div>
          </section>
        )}

        {/* 空状态 */}
        {publicChannels.length === 0 && privateChannels.length === 0 && (
          <div className="py-8 text-center text-text-muted">
            <p className="text-sm">加载频道中...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mx-2 p-2 bg-danger/10 border border-danger/50 rounded text-sm text-danger">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-danger hover:underline"
            >
              关闭
            </button>
          </div>
        )}

        {/* 调试信息 */}
        <div className="mx-2 mt-4 p-2 bg-bg-tertiary rounded text-xs">
          <details>
            <summary className="font-mono text-text-muted cursor-pointer">
              调试信息 (点击展开)
            </summary>
            <div className="mt-2 font-mono text-text-muted">
              <div className="font-bold mb-1">频道信息:</div>
              <div>总频道数: {publicChannels.length + privateChannels.length}</div>
              <div>公共频道: {publicChannels.length}</div>
              <div>私有频道: {privateChannels.length}</div>
              <div className="mt-2 font-bold">频道列表:</div>
              {publicChannels.concat(privateChannels).length > 0 ? (
                publicChannels.concat(privateChannels).map(ch => (
                  <div key={ch.id} className="ml-2">
                    <details>
                      <summary className="cursor-pointer">
                        {ch.name} → {ch.id}
                        {ch.inviteCode && <span className="text-primary"> ({ch.inviteCode})</span>}
                      </summary>
                      <pre className="mt-1 text-xs bg-bg-secondary p-1 rounded overflow-auto">
                        {JSON.stringify(ch, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))
              ) : (
                <div className="ml-2 text-warning">无频道</div>
              )}
              <div className="mt-2 font-bold">邀请码映射:</div>
              {Object.keys(localStorage).filter(k => k.startsWith('channel_invite_')).length > 0 ? (
                Object.keys(localStorage).filter(k => k.startsWith('channel_invite_')).map(k => {
                  const inviteCode = k.replace('channel_invite_', '');
                  const channelId = localStorage.getItem(k);
                  const exists = publicChannels.concat(privateChannels).some(ch => ch.id === channelId);
                  return (
                    <div key={k} className={`ml-2 ${exists ? '' : 'text-warning'}`}>
                      {inviteCode} → {channelId} {!exists ? '⚠️ (频道不存在)' : '✓'}
                    </div>
                  );
                })
              ) : (
                <div className="ml-2 text-warning">⚠️ 没有找到邀请码映射</div>
              )}
            </div>
          </details>
        </div>
      </div>

      {/* 创建频道模态框 */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => {
            setShowCreateModal(false);
            setError(null);
          }}
          onCreate={handleCreateChannel}
        />
      )}

      {/* 密码输入模态框 */}
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

      {/* 加入频道模态框 */}
      {showJoinModal && (
        <JoinChannelModal
          onClose={() => {
            setShowJoinModal(false);
            setError(null);
          }}
          onJoin={handleJoinByInviteCode}
          currentUserId={userId}
        />
      )}
    </>
  );
}
