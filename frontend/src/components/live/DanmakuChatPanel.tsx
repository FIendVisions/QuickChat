'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { messageApi } from '@/services/api/message.api';
import { mapChannelMessage } from '@/lib/mapChannelMessage';
import { getApiOrigin } from '@/lib/serverOrigin';
import type { ChatMessage } from '@/types/message.types';

interface DanmakuChatPanelProps {
  channelId: string;
  userId: string;
  username: string;
  token: string | null;
}

/**
 * 直播间内小型聊天：列表 + 单行输入，样式偏弹幕/半透明浮层。
 */
export function DanmakuChatPanel({
  channelId,
  userId,
  username,
  token,
}: DanmakuChatPanelProps) {
  const { socket, connected } = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await messageApi.getMessages(channelId, 1, 40);
        if (cancelled) return;
        const mapped = (data.messages || []).map((m: unknown) => mapChannelMessage(m));
        setMessages(mapped);
        scrollBottom();
      } catch {
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, scrollBottom]);

  useEffect(() => {
    if (!socket || !connected) return;

    const onNew = (data: Record<string, unknown>) => {
      if (String(data.channelId) !== channelId) return;
      if (String(data.userId) === userId) return;
      const m = mapChannelMessage(data);
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
      scrollBottom();
    };

    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
    };
  }, [socket, connected, channelId, userId, scrollBottom]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      channelId,
      userId,
      username,
      content,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    scrollBottom();

    try {
      const response = await fetch(`${getApiOrigin()}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          content,
          userId,
          username,
          type: 'TEXT',
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || '发送失败');
      }
      const result = await response.json();
      const real = mapChannelMessage(result);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? real : m)).filter((m, i, a) => {
          if (m.id === real.id) return a.findIndex((x) => x.id === real.id) === i;
          return true;
        }),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-30 flex w-[min(calc(100vw-8rem),380px)] flex-col rounded-xl border border-white/15 bg-black/80 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white/50">
        弹幕聊天
      </div>
      <div
        ref={listRef}
        className="max-h-36 min-h-[100px] space-y-1 overflow-y-auto px-2 py-1.5 text-[11px] leading-snug"
      >
        {messages.length === 0 && (
          <p className="py-2 text-center text-white/40">暂无消息</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`break-words rounded px-1.5 py-0.5 ${
              m.userId === userId ? 'bg-primary/25 text-white' : 'bg-white/5 text-white/90'
            }`}
          >
            <span className="font-semibold text-primary/90">{m.username}:</span>{' '}
            <span className="text-white/85">{m.content}</span>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-1 border-t border-white/10 p-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="发一条弹幕…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/35 focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="shrink-0 rounded-md bg-primary p-1.5 text-white disabled:opacity-40"
          title="发送"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
