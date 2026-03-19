// frontend/src/components/channel/ChannelList.tsx

'use client';

import { useState } from 'react';
import { useChannel } from '@/hooks/useChannel';
import { ChannelItem } from './ChannelItem';
import { CreateChannelModal } from './CreateChannelModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import { JoinChannelModal } from './JoinChannelModal';
import { Channel, ChannelType } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';
import { Plus, LogIn, ChevronDown, ChevronRight } from 'lucide-react';

interface ChannelListProps {
  userId: string;
  token?: string;
  onChannelSelect?: (channel: Channel) => void;
}

const OFFICIAL_CHANNEL: Channel = {
  id: 'public-official',
  name: '公共频道',
  type: ChannelType.PUBLIC,
  description: '官方频道 - 所有用户自动加入',
  ownerId: 'system',
  participantCount: 0,
  hasPassword: false,
  requiresApproval: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function ChannelList({ userId, token, onChannelSelect }: ChannelListProps) {
  const { publicChannels, privateChannels, isLoading, refetch } = useChannel(userId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [officialExpanded, setOfficialExpanded] = useState(true);
  const [publicExpanded, setPublicExpanded] = useState(true);
  const [privateExpanded, setPrivateExpanded] = useState(true);

  const handleChannelClick = async (channel: Channel) => {
    setError(null);

    if (channel.id === 'public-official') {
      onChannelSelect?.(channel);
      return;
    }

    try {
      await channelApi.join(channel.id);
      onChannelSelect?.(channel);
    } catch (error: any) {
      if (error.message?.includes('password') || error.message?.includes('密码')) {
        if (channel.hasPassword) {
          setSelectedChannel(channel);
          setShowPasswordModal(true);
          return;
        }
      }
      // "already in channel" 等情况，直接选中
      onChannelSelect?.(channel);
    }
  };

  const handleCreateChannel = async (data: {
    name: string;
    type: 'public' | 'private';
    description?: string;
    password?: string;
  }) => {
    try {
      setError(null);
      const username = localStorage.getItem('username') || '';
      await channelApi.create({
        name: data.name,
        type: data.type.toUpperCase() as 'PUBLIC' | 'PRIVATE',
        description: data.description,
        password: data.password,
        userId,
        username,
      });
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message || '创建频道失败');
      throw err;
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedChannel) return;
    try {
      setError(null);
      await channelApi.join(selectedChannel.id, password);
      onChannelSelect?.(selectedChannel);
      setShowPasswordModal(false);
      setSelectedChannel(null);
      window.dispatchEvent(new CustomEvent('channelsChanged'));
    } catch (err: any) {
      setError(err.message || '密码错误');
      throw err;
    }
  };

  const handleJoinByChannelId = async (channelId: string) => {
    try {
      const channel = await channelApi.getById(channelId);
      if (channel) {
        // 加入后刷新列表，让私密频道出现在列表中
        window.dispatchEvent(new CustomEvent('channelsChanged'));
        onChannelSelect?.(channel);
      } else {
        setError('频道不存在');
      }
    } catch (err: any) {
      setError(err.message || '加入频道失败');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-3">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 rounded bg-bg-tertiary/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* 操作按钮 */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-all text-sm font-medium"
          >
            <Plus size={16} />
            创建频道
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-bg-tertiary hover:bg-bg-hover text-text-muted hover:text-text-normal transition-all text-sm"
          >
            <LogIn size={16} />
            通过ID加入私密频道
          </button>
        </div>

        {/* 频道列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {/* --- 官方频道 --- */}
          <SectionHeader
            title="官方频道"
            expanded={officialExpanded}
            onToggle={() => setOfficialExpanded(!officialExpanded)}
          />
          {officialExpanded && (
            <div className="space-y-0.5 ml-1">
              <ChannelItem
                channel={OFFICIAL_CHANNEL}
                onClick={handleChannelClick}
              />
            </div>
          )}

          {/* --- 公开频道 --- */}
          <SectionHeader
            title="公开频道"
            count={publicChannels.length}
            expanded={publicExpanded}
            onToggle={() => setPublicExpanded(!publicExpanded)}
          />
          {publicExpanded && (
            <div className="space-y-0.5 ml-1">
              {publicChannels.length > 0 ? (
                publicChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    onClick={handleChannelClick}
                  />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-text-muted">暂无公开频道</p>
              )}
            </div>
          )}

          {/* --- 私密频道 --- */}
          <SectionHeader
            title="私密频道"
            count={privateChannels.length}
            expanded={privateExpanded}
            onToggle={() => setPrivateExpanded(!privateExpanded)}
          />
          {privateExpanded && (
            <div className="space-y-0.5 ml-1">
              {privateChannels.length > 0 ? (
                privateChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    onClick={handleChannelClick}
                  />
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-text-muted">暂无私密频道</p>
              )}
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-2 mb-2 p-2 bg-danger/10 border border-danger/50 rounded text-sm text-danger">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:underline">关闭</button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChannelModal
          onClose={() => { setShowCreateModal(false); setError(null); }}
          onCreate={handleCreateChannel}
        />
      )}

      {showPasswordModal && selectedChannel && (
        <PasswordPromptModal
          channelName={selectedChannel.name}
          onClose={() => { setShowPasswordModal(false); setSelectedChannel(null); setError(null); }}
          onSubmit={handlePasswordSubmit}
        />
      )}

      {showJoinModal && (
        <JoinChannelModal
          onClose={() => { setShowJoinModal(false); setError(null); }}
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
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1 px-2 py-1.5 mt-2 first:mt-0 text-xs font-semibold uppercase text-text-muted hover:text-text-normal transition-colors"
    >
      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span>{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-[10px] bg-bg-tertiary px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}
