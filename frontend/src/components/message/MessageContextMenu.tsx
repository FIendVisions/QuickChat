'use client';

import { useEffect, useRef } from 'react';
import { Reply, Copy, Pin, PinOff, Users } from 'lucide-react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onTogglePersonalPin: () => void;
  onToggleEveryonePin: () => void | Promise<void>;
  isPersonalPinned: boolean;
  isEveryonePinned: boolean;
  /** 临时消息等不可置顶时传 false，隐藏置顶项 */
  canPin?: boolean;
  /** 临时消息等不可回复时传 false，隐藏回复项 */
  canReply?: boolean;
}

export function MessageContextMenu({
  x,
  y,
  onClose,
  onReply,
  onCopy,
  onTogglePersonalPin,
  onToggleEveryonePin,
  isPersonalPinned,
  isEveryonePinned,
  canPin = true,
  canReply = true,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
    if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;
    el.style.left = `${Math.max(8, left)}px`;
    el.style.top = `${Math.max(8, top)}px`;
  }, [x, y]);

  const item =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-normal hover:bg-bg-hover';

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[200px] rounded-lg border border-border-color bg-bg-secondary py-1 shadow-xl"
      style={{ left: x, top: y }}
      role="menu"
    >
      {canReply && (
        <button type="button" className={item} onClick={() => { onReply(); onClose(); }}>
          <Reply size={16} className="text-text-muted" />
          回复
        </button>
      )}
      <button type="button" className={item} onClick={() => { onCopy(); onClose(); }}>
        <Copy size={16} className="text-text-muted" />
        拷贝文本
      </button>
      {canPin && (
        <>
          <button
            type="button"
            className={item}
            onClick={() => {
              onTogglePersonalPin();
              onClose();
            }}
          >
            {isPersonalPinned ? (
              <PinOff size={16} className="text-warning" />
            ) : (
              <Pin size={16} className="text-text-muted" />
            )}
            {isPersonalPinned ? '取消个人置顶' : '个人置顶'}
          </button>
          <button
            type="button"
            className={item}
            onClick={async () => {
              await onToggleEveryonePin();
              onClose();
            }}
          >
            {isEveryonePinned ? (
              <PinOff size={16} className="text-warning" />
            ) : (
              <Users size={16} className="text-primary" />
            )}
            {isEveryonePinned ? '取消全员置顶' : '全员置顶'}
          </button>
        </>
      )}
    </div>
  );
}
