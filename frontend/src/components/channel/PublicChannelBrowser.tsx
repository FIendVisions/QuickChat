// frontend/src/components/channel/PublicChannelBrowser.tsx

'use client';

import { useState } from 'react';
import { Globe, Users, Lock, Hash, LogIn, Search } from 'lucide-react';
import { Channel, ChannelType } from '@/types/channel.types';
import { useChannel } from '@/hooks/useChannel';
import { channelApi } from '@/services/api/channel.api';
import { PasswordPromptModal } from './PasswordPromptModal';

interface PublicChannelBrowserProps {
  userId: string;
  onChannelSelect: (channel: Channel) => void;
}

export function PublicChannelBrowser({ userId, onChannelSelect }: PublicChannelBrowserProps) {
  const { publicChannels, isLoading } = useChannel();
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [passwordChannel, setPasswordChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = publicChannels
    .filter(ch => ch.id !== 'public-official')
    .filter(ch => !search || ch.name.toLowerCase().includes(search.toLowerCase()));

  const handleJoin = async (channel: Channel) => {
    if (channel.hasPassword) {
      setPasswordChannel(channel);
      return;
    }
    setJoiningId(channel.id);
    setError(null);
    try {
      await channelApi.join(channel.id);
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      onChannelSelect(channel);
    } catch (err: any) {
      if (err.message?.includes('already')) {
        onChannelSelect(channel);
      } else {
        setError(err.message);
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handlePasswordJoin = async (password: string) => {
    if (!passwordChannel) return;
    try {
      await channelApi.join(passwordChannel.id, password);
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      onChannelSelect(passwordChannel);
      setPasswordChannel(null);
    } catch (err: any) {
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted animate-pulse">加载公开频道...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 头部 */}
      <div className="border-b border-border-color bg-bg-tertiary px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={24} className="text-success" />
          <div>
            <h2 className="text-lg font-bold text-text-normal">公开频道</h2>
            <p className="text-xs text-text-muted">浏览所有公开频道，点击加入开始聊天</p>
          </div>
        </div>
        {/* 搜索 */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索频道..."
            className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border-color rounded-lg text-sm text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* 频道列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/50 rounded-lg text-sm text-danger">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Globe size={48} className="mb-4 opacity-30" />
            <p className="text-lg mb-1">
              {search ? '没有找到匹配的频道' : '暂无公开频道'}
            </p>
            <p className="text-sm">
              {search ? '试试其他关键词' : '创建一个公开频道让大家加入吧'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onJoin={() => handleJoin(channel)}
                isJoining={joiningId === channel.id}
              />
            ))}
          </div>
        )}
      </div>

      {passwordChannel && (
        <PasswordPromptModal
          channelName={passwordChannel.name}
          onClose={() => setPasswordChannel(null)}
          onSubmit={handlePasswordJoin}
        />
      )}
    </div>
  );
}

function ChannelCard({ channel, onJoin, isJoining }: {
  channel: Channel;
  onJoin: () => void;
  isJoining: boolean;
}) {
  return (
    <div className="bg-bg-secondary border border-border-color rounded-xl p-4 hover:border-primary/50 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
          <Hash size={20} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-text-normal truncate">{channel.name}</h3>
            {channel.hasPassword && <Lock size={12} className="text-text-muted flex-shrink-0" />}
          </div>
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
            {channel.description || '暂无描述'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {channel.participantCount || 0} 成员
          </span>
          {channel.owner && (
            <span>创建者: {channel.owner.username}</span>
          )}
        </div>
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success hover:text-white transition-all text-xs font-medium disabled:opacity-50"
        >
          <LogIn size={12} />
          {isJoining ? '加入中' : '加入'}
        </button>
      </div>
    </div>
  );
}
