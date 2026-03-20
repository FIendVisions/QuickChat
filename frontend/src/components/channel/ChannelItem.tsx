// frontend/src/components/channel/ChannelItem.tsx

'use client';

import { useState, useCallback } from 'react';
import { Hash, Lock, Users, Copy, Check, Mic, Video } from 'lucide-react';
import { Channel, ChannelType, ChannelKind } from '@/types/channel.types';

interface ChannelItemProps {
  channel: Channel;
  onClick?: (channel: Channel) => void;
  showTypeBadge?: boolean;
  /** Discord 侧栏深色样式 */
  dark?: boolean;
}

export function ChannelItem({ channel, onClick, showTypeBadge, dark }: ChannelItemProps) {
  const [copied, setCopied] = useState(false);
  const isPrivate = channel.type === ChannelType.PRIVATE;
  const isOfficial = channel.id === 'public-official';
  const kind = channel.kind ?? ChannelKind.TEXT;

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

  const rowHover = dark ? 'hover:bg-white/10' : 'hover:bg-bg-hover';
  const nameClass = dark
    ? 'truncate text-sm text-white/85 group-hover:text-white'
    : 'truncate text-sm text-text-normal group-hover:text-white';

  const KindIcon =
    kind === ChannelKind.VOICE ? (
      <Mic size={14} className={dark ? 'text-amber-300' : 'text-amber-500'} />
    ) : kind === ChannelKind.LIVE ? (
      <Video size={14} className={dark ? 'text-rose-300' : 'text-rose-500'} />
    ) : isPrivate ? (
      <Lock size={14} className={dark ? 'text-violet-300' : 'text-primary'} />
    ) : (
      <Hash size={14} className={dark ? 'text-emerald-300' : 'text-success'} />
    );

  return (
    <div
      onClick={handleClick}
      className={`group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-150 ${rowHover}`}
    >
      <div className="flex-shrink-0">{KindIcon}</div>

      {/* 名称 + 徽标 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={nameClass}>
            {channel.name}
          </span>
          {isOfficial && (
            <span className="flex-shrink-0 rounded bg-yellow-500/20 px-1 py-0.5 text-[10px] text-yellow-500 leading-none">
              官方
            </span>
          )}
          {showTypeBadge && !isOfficial && (
            <span
              className={`flex-shrink-0 rounded px-1 py-0.5 text-[10px] leading-none ${
                isPrivate
                  ? dark
                    ? 'bg-violet-500/25 text-violet-200'
                    : 'bg-primary/20 text-primary'
                  : dark
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : 'bg-success/20 text-success'
              }`}
            >
              {isPrivate ? '私密' : '公开'}
            </span>
          )}
          {channel.hasPassword && (
            <Lock size={10} className="flex-shrink-0 text-text-muted" />
          )}
        </div>
      </div>

      {/* 人数 */}
      <div
        className={`flex flex-shrink-0 items-center gap-0.5 text-[10px] ${dark ? 'text-white/40' : 'text-text-muted'}`}
      >
        <Users size={10} />
        <span>{channel.participantCount ?? 0}</span>
      </div>

      {/* 复制ID（hover时显示） */}
      {!isOfficial && (
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 ${
            dark ? 'text-white/45 hover:text-white' : 'text-text-muted hover:text-primary'
          }`}
          title={copied ? '已复制' : '复制频道ID'}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
