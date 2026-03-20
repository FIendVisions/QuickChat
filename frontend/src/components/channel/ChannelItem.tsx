'use client';

import { useState, useCallback } from 'react';
import { Hash, Lock, Users, Copy, Check, Mic, MessagesSquare, Pencil, Plus } from 'lucide-react';
import { Channel, ChannelType, ChannelKind } from '@/types/channel.types';

interface ChannelItemProps {
  channel: Channel;
  onClick?: (channel: Channel) => void;
  showTypeBadge?: boolean;
  dark?: boolean;
  selected?: boolean;
  canEdit?: boolean;
  onEdit?: (channel: Channel) => void;
  /** 在此频道所属分组下新建频道（与编辑按钮并列的 +） */
  onAddChannelInGroup?: (channel: Channel) => void;
}

export function ChannelItem({
  channel,
  onClick,
  showTypeBadge,
  dark,
  selected,
  canEdit,
  onEdit,
  onAddChannelInGroup,
}: ChannelItemProps) {
  const [copied, setCopied] = useState(false);
  const isPrivate = channel.type === ChannelType.PRIVATE;
  const kind = channel.kind ?? ChannelKind.TEXT;

  const handleClick = useCallback(() => {
    onClick?.(channel);
  }, [channel, onClick]);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(channel.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    },
    [channel],
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(channel);
    },
    [channel, onEdit],
  );

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddChannelInGroup?.(channel);
    },
    [channel, onAddChannelInGroup],
  );

  const rowBase = dark
    ? selected
      ? 'bg-dc-channel-active text-dc-channel-text-active'
      : 'text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active'
    : selected
      ? 'bg-bg-active text-text-normal'
      : 'text-text-normal hover:bg-bg-hover';

  const iconMuted = dark
    ? selected
      ? 'text-dc-channel-text-active'
      : 'text-dc-channel-text'
    : 'text-text-muted';

  const KindIcon =
    kind === ChannelKind.VOICE ? (
      <Mic size={18} className={`shrink-0 ${iconMuted}`} strokeWidth={2} />
    ) : kind === ChannelKind.FORUM ? (
      <MessagesSquare size={18} className={`shrink-0 ${iconMuted}`} strokeWidth={2} />
    ) : isPrivate ? (
      <Lock size={16} className={`shrink-0 ${iconMuted}`} strokeWidth={2} />
    ) : (
      <Hash size={18} className={`shrink-0 ${iconMuted}`} strokeWidth={2} />
    );

  return (
    <div
      onClick={handleClick}
      className={`group relative mx-2 flex cursor-pointer items-center gap-1.5 rounded-[4px] px-2 py-1.5 transition-colors duration-100 ${rowBase}`}
    >
      {KindIcon}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium leading-5">{channel.name}</span>
          {showTypeBadge && (
            <span
              className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium leading-none ${
                isPrivate ? 'bg-primary/25 text-primary' : 'bg-[#23a559]/20 text-[#23a559]'
              }`}
            >
              {isPrivate ? '私密' : '公开'}
            </span>
          )}
          {channel.hasPassword && <Lock size={10} className="shrink-0 opacity-60" />}
        </div>
      </div>

      <div
        className={`flex shrink-0 items-center gap-0.5 text-[11px] tabular-nums ${
          dark ? (selected ? 'text-dc-channel-text' : 'text-dc-channel-text/70') : 'text-text-muted'
        }`}
      >
        <Users size={11} />
        <span>{channel.participantCount ?? 0}</span>
      </div>

      {canEdit && onEdit && (
        <button
          type="button"
          onClick={handleEdit}
          title="重命名"
          className={`shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
            dark ? 'text-dc-channel-text hover:text-dc-channel-text-active' : 'text-text-muted hover:text-primary'
          }`}
        >
          <Pencil size={14} />
        </button>
      )}

      {onAddChannelInGroup && (
        <button
          type="button"
          onClick={handleAdd}
          title="在此分组下新建频道"
          className={`shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
            dark ? 'text-dc-channel-text hover:text-dc-channel-text-active' : 'text-text-muted hover:text-primary'
          }`}
        >
          <Plus size={14} strokeWidth={2.5} />
        </button>
      )}

      <button
        onClick={handleCopy}
        className={`shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 ${
          dark ? 'text-dc-channel-text hover:text-dc-channel-text-active' : 'text-text-muted hover:text-primary'
        }`}
        title={copied ? '已复制' : '复制频道 ID'}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
