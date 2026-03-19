// frontend/src/components/channel/ChannelItem.tsx

'use client';

import { useState, useCallback } from 'react';
import { Hash, Lock, Users, Copy, Check } from 'lucide-react';
import { Channel, ChannelType } from '@/types/channel.types';

interface ChannelItemProps {
  channel: Channel;
  onClick?: (channel: Channel) => void;
  showTypeBadge?: boolean;
}

export function ChannelItem({ channel, onClick, showTypeBadge }: ChannelItemProps) {
  const [copied, setCopied] = useState(false);
  const isPrivate = channel.type === ChannelType.PRIVATE;
  const isOfficial = channel.id === 'public-official';

  const handleClick = useCallback(() => {
    onClick?.(channel);
  }, [channel, onClick]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(channel.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [channel]);

  return (
    <div
      onClick={handleClick}
      className={`
        group relative flex items-center gap-2 rounded-md px-2 py-1.5
        cursor-pointer transition-all duration-150
        hover:bg-bg-hover
      `}
    >
      {/* 图标 */}
      <div className="flex-shrink-0">
        {isPrivate ? (
          <Lock size={14} className="text-primary" />
        ) : (
          <Hash size={14} className="text-success" />
        )}
      </div>

      {/* 名称 + 徽标 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm text-text-normal group-hover:text-white">
            {channel.name}
          </span>
          {isOfficial && (
            <span className="flex-shrink-0 rounded bg-yellow-500/20 px-1 py-0.5 text-[10px] text-yellow-500 leading-none">
              官方
            </span>
          )}
          {showTypeBadge && !isOfficial && (
            <span className={`flex-shrink-0 rounded px-1 py-0.5 text-[10px] leading-none ${
              isPrivate
                ? 'bg-primary/20 text-primary'
                : 'bg-success/20 text-success'
            }`}>
              {isPrivate ? '私密' : '公开'}
            </span>
          )}
          {channel.hasPassword && (
            <Lock size={10} className="flex-shrink-0 text-text-muted" />
          )}
        </div>
      </div>

      {/* 人数 */}
      <div className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-text-muted">
        <Users size={10} />
        <span>{channel.participantCount ?? 0}</span>
      </div>

      {/* 复制ID（hover时显示） */}
      {!isOfficial && (
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-0.5 rounded text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
          title={copied ? '已复制' : '复制频道ID'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
