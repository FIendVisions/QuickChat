// frontend/src/components/channel/PublicChannelView.tsx

'use client';

import { Channel } from '@/types/channel.types';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';

interface PublicChannelViewProps {
  channel: Channel;
  userId: string;
}

/**
 * 公共频道视图
 * 仅支持文本聊天，禁止语音功能
 */
export function PublicChannelView({ channel, userId }: PublicChannelViewProps) {
  return (
    <div className="flex h-full flex-col">
      {/* 频道信息 */}
      <div className="border-b border-bg-secondary p-4">
        <h2 className="text-xl font-bold text-text-normal">#{channel.name}</h2>
        {channel.description && (
          <p className="mt-1 text-sm text-text-muted">{channel.description}</p>
        )}
        <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
          <span>{channel.participantCount} 成员</span>
          <span>公共频道</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden">
        <MessageList channelId={channel.id} userId={userId} />
      </div>

      {/* 消息输入 */}
      <MessageInput channelId={channel.id} currentUserId={userId} currentUsername={userId} />
    </div>
  );
}
