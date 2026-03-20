'use client';

import { X } from 'lucide-react';
import type { ChatMessage } from '@/types/message.types';
import { messageToPlainText } from '@/lib/messagePlainText';

interface PinnedMessagesBarProps {
  pinnedIds: string[];
  messages: ChatMessage[];
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedMessagesBar({
  pinnedIds,
  messages,
  onJump,
  onUnpin,
}: PinnedMessagesBarProps) {
  if (pinnedIds.length === 0) return null;

  const byId = new Map(messages.map((m) => [m.id, m]));

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="self-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        置顶
      </span>
      {pinnedIds.map((id) => {
        const m = byId.get(id);
        const label = m
          ? `${m.username}: ${messageToPlainText(m).slice(0, 36)}${messageToPlainText(m).length > 36 ? '…' : ''}`
          : `消息 ${id.slice(0, 8)}…`;

        return (
          <div
            key={id}
            className="group flex max-w-[220px] items-center gap-1 rounded-full border border-border-color bg-bg-tertiary/80 pl-2.5 pr-1 text-xs"
          >
            <button
              type="button"
              className="min-w-0 truncate py-1 text-left text-text-normal hover:text-primary"
              title={m ? messageToPlainText(m) : '点击尝试跳转'}
              onClick={() => onJump(id)}
            >
              {label}
            </button>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-danger"
              title="取消置顶"
              onClick={() => onUnpin(id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
