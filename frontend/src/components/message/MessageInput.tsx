// frontend/src/components/message/MessageInput.tsx

'use client';

import { useState, FormEvent } from 'react';
import { Send, Smile } from 'lucide-react';
import { sendNewMessage } from '@/lib/dbHelpers';
import { messageApi } from '@/services/api/message.api';

interface MessageInputProps {
  channelId: string;
  currentUserId?: string;
  currentUsername?: string;
  onSend?: (content: string) => void;
}

/**
 * 消息输入框组件
 * 通过回调函数发送消息（由父组件处理实际发送逻辑）
 */
export function MessageInput({
  channelId,
  currentUserId,
  currentUsername,
  onSend
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  /**
   * 发送消息
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const content = message.trim();
    if (!content || isSending) return;

    setIsSending(true);

    try {
      // 如果提供了 onSend 回调，使用它来发送消息
      // 这样可以由父组件控制实际的发送逻辑（通过 useRealtimeMessages）
      if (onSend) {
        await onSend(content);
      } else {
        // 如果没有提供回调，直接使用 API（向后兼容）
        const userId = currentUserId || localStorage.getItem('userId') || 'anonymous';
        const username = currentUsername || localStorage.getItem('username') || '匿名用户';
        await messageApi.send(channelId, content, userId, username);
      }

      // 清空输入框
      setMessage('');
    } catch (error: any) {
      console.error('❌ 发送消息失败:', error);
      alert(`发送消息失败: ${error.message || '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  /**
   * 处理键盘快捷键
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* 表情按钮（暂未实现） */}
        <button
          type="button"
          className="rounded p-2 text-text-muted hover:bg-bg-tertiary hover:text-text-normal transition-colors"
          title="表情"
        >
          <Smile size={20} />
        </button>

        {/* 输入框 */}
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="w-full resize-none rounded-md bg-bg-tertiary px-3 py-2 text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSending}
          />
        </div>

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={!message.trim() || isSending}
          className="rounded p-2 text-primary hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="发送"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
