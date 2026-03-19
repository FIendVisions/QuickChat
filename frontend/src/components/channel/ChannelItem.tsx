// frontend/src/components/channel/ChannelItem.tsx

'use client';

import { useState, useCallback } from 'react';
import { Hash, Lock, Users, ChevronRight, Copy, Check } from 'lucide-react';
import { Channel, ChannelType } from '@/types/channel.types';
import { getChannelInviteCode } from '@/lib/channelStorage';

interface ChannelItemProps {
  channel: Channel & { inviteCode?: string };
  onClick?: (channel: Channel) => void;
}

/**
 * 频道项组件
 */
export function ChannelItem({ channel, onClick }: ChannelItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  // 获取频道图标
  const getIcon = () => {
    if (channel.type === ChannelType.PRIVATE) {
      return <Lock size={16} className="text-primary" />;
    }
    return <Hash size={16} className="text-success" />;
  };

  // 获取边框颜色
  const getBorderClass = () => {
    if (channel.type === ChannelType.PRIVATE) {
      return 'border-l-4 border-primary';
    }
    return 'border-l-4 border-success';
  };

  // 点击处理
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(channel);
    }
  }, [channel, onClick]);

  // 复制邀请码
  const handleCopyInviteCode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 复制频道ID而不是邀请码，这样更通用
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={`
        group relative flex items-center gap-3 rounded px-2 py-1.5
        cursor-pointer transition-all duration-150
        ${getBorderClass()}
        ${isHovered ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/50'}
      `}
    >
      {/* 频道图标 */}
      <div className="flex-shrink-0">
        {getIcon()}
      </div>

      {/* 频道名称 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-text-normal group-hover:text-white">
            {channel.name}
          </p>
          {channel.id === 'public-official' && (
            <span className="flex-shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-500">
              官方
            </span>
          )}
          {channel.inviteCode && (
            <span className="flex-shrink-0 font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {channel.inviteCode}
            </span>
          )}
        </div>
        {isHovered && channel.id !== 'public-official' && (
          <p className="text-xs text-text-muted font-mono truncate" title={channel.id}>
            ID: {channel.id}
          </p>
        )}
      </div>

      {/* 复制频道ID按钮 */}
      {channel.id !== 'public-official' && isHovered && (
        <button
          onClick={handleCopyInviteCode}
          className="flex-shrink-0 p-1 rounded text-text-muted hover:text-primary hover:bg-bg-tertiary transition-all opacity-0 group-hover:opacity-100"
          title={copied ? '已复制！' : '复制频道ID'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      )}

      {/* 人数和密码指示 */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 人数 */}
        {channel.type === ChannelType.PRIVATE && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Users size={12} />
            <span>{channel.participantCount}</span>
            {channel.maxParticipants && (
              <span>/ {channel.maxParticipants}</span>
            )}
          </div>
        )}

        {/* 密码锁 */}
        {channel.hasPassword && (
          <Lock size={12} className="text-text-muted" />
        )}

        {/* 箭头 */}
        <ChevronRight size={16} className="text-text-muted" />
      </div>

      {/* 悬停时显示的提示 */}
      {isHovered && channel.description && (
        <div className="absolute left-full ml-2 w-64 p-2 bg-bg-floating rounded-lg shadow-xl z-50">
          <p className="text-sm font-medium text-text-normal">{channel.name}</p>
          {channel.description && (
            <p className="mt-1 text-xs text-text-muted line-clamp-2">
              {channel.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
