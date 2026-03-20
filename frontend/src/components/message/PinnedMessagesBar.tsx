'use client';

import { X } from 'lucide-react';
import type { ChatMessage } from '@/types/message.types';
import type { EveryonePin } from '@/types/pin.types';
import { messageToPlainText } from '@/lib/messagePlainText';

interface PinnedMessagesBarProps {
  everyonePins: EveryonePin[];
  personalPinIds: string[];
  messages: ChatMessage[];
  onJump: (messageId: string) => void;
  /** 全员置顶：任意成员可取消 */
  onUnpinEveryone: (messageId: string) => void;
  /** 个人置顶：仅自己可见与取消 */
  onUnpinPersonal: (messageId: string) => void;
}

export function PinnedMessagesBar({
  everyonePins,
  personalPinIds,
  messages,
  onJump,
  onUnpinEveryone,
  onUnpinPersonal,
}: PinnedMessagesBarProps) {
  if (everyonePins.length === 0 && personalPinIds.length === 0) return null;

  const byId = new Map(messages.map((m) => [m.id, m]));

  const chip = (
    id: string,
    scope: 'everyone' | 'personal',
    extra?: { pinnedByUsername?: string },
  ) => {
    const m = byId.get(id);
    const plain = m ? messageToPlainText(m) : '';
    const label = m
      ? `${m.username}: ${plain.slice(0, 28)}${plain.length > 28 ? '…' : ''}`
      : `消息 ${id.slice(0, 8)}…`;

    const scopeLabel = scope === 'everyone' ? '全员' : '我的';
    const scopeClass =
      scope === 'everyone'
        ? 'border-primary/50 bg-primary/10 text-primary'
        : 'border-border-color bg-bg-tertiary/80 text-text-muted';

    return (
      <div
        key={`${scope}-${id}`}
        className="group flex max-w-[240px] items-center gap-1 rounded-full border border-border-color bg-bg-tertiary/80 pl-2 pr-1 text-xs"
      >
        <span
          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${scopeClass}`}
        >
          {scopeLabel}
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 truncate py-1 text-left text-text-normal hover:text-primary"
          title={
            m
              ? plain + (scope === 'everyone' && extra?.pinnedByUsername
                ? ` · 由 ${extra.pinnedByUsername} 置顶`
                : '')
              : '点击尝试跳转'
          }
          onClick={() => onJump(id)}
        >
          {label}
        </button>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-danger"
          title={scope === 'everyone' ? '取消全员置顶' : '取消个人置顶'}
          onClick={() =>
            scope === 'everyone' ? onUnpinEveryone(id) : onUnpinPersonal(id)
          }
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="self-center text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          置顶
        </span>
        {everyonePins.map((p) => chip(p.messageId, 'everyone', { pinnedByUsername: p.pinnedByUsername }))}
        {personalPinIds.map((id) => chip(id, 'personal'))}
      </div>
    </div>
  );
}
