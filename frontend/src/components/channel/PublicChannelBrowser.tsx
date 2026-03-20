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
      <div className="flex flex-1 items-center justify-center bg-dc-chat">
        <div className="animate-pulse text-dc-channel-text">加载公开频道...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-dc-chat">
      <div className="border-b border-black/20 bg-dc-chat px-6 py-4 shadow-dc-header">
        <div className="mb-3 flex items-center gap-3">
          <Globe size={24} className="text-[#23a559]" />
          <div>
            <h2 className="text-lg font-bold text-dc-channel-text-active">公开频道</h2>
            <p className="text-xs text-dc-channel-text">浏览全站公开频道，点击加入开始聊天</p>
          </div>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dc-channel-text" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索频道..."
            className="w-full rounded-lg border border-black/20 bg-dc-input py-2 pl-9 pr-3 text-sm text-dc-channel-text-active placeholder:text-dc-channel-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/50 rounded-lg text-sm text-danger">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">关闭</button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-dc-channel-text">
            <Globe size={48} className="mb-4 opacity-30" />
            <p className="mb-1 text-lg text-dc-channel-text-active">
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
    <div className="rounded-xl border border-black/20 bg-dc-channels p-4 transition-all hover:border-primary/40 group">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#23a559]/15">
          <Hash size={20} className="text-[#23a559]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-dc-channel-text-active">{channel.name}</h3>
            {channel.hasPassword && <Lock size={12} className="flex-shrink-0 text-dc-channel-text" />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-dc-channel-text">
            {channel.description || '暂无描述'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-dc-channel-text">
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
