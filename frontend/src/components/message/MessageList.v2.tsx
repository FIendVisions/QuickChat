// frontend/src/components/message/MessageList.v2.tsx

'use client';

import { useEffect, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { messageApi } from '@/services/api/message.api';
import { useWebSocket } from '@/contexts/WebSocketContext.v2';
import { getMessageSyncManager, Message } from '@/services/messageSync/MessageSyncManager';

interface MessageListProps {
  channelId: string;
  userId: string;
}

export interface MessageListRef {
  refresh: () => void;
  getMessages: () => Message[];
}

export const MessageListV2 = forwardRef<MessageListRef, MessageListProps>(
  ({ channelId, userId }, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { socket, connected, joinChannel, leaveChannel } = useWebSocket();
    const messageSync = getMessageSyncManager();
    const initializingRef = useRef(false);

    /**
     * 加载历史消息
     */
    const loadHistory = async () => {
      if (initializingRef.current) {
        console.log('⏳ [MessageList] Already initializing, skipping');
        return;
      }

      initializingRef.current = true;
      try {
        setIsLoading(true);
        console.log(`📜 [MessageList] Loading history for channel ${channelId}`);

        const data = await messageApi.getMessages(channelId, 1, 100);

        // 转换为标准格式
        const messages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          seq: msg.sequence || 0,
          channelId: msg.channelId,
          userId: msg.userId,
          username: msg.user?.username || 'Unknown',
          avatar: msg.user?.avatar,
          content: msg.content,
          type: msg.type,
          status: msg.status || 'SENT',
          createdAt: msg.createdAt,
        }));

        // 添加到消息同步管理器
        messageSync.addMessages(channelId, messages);

        // 更新状态
        setMessages(messages);

        console.log(`✅ [MessageList] Loaded ${messages.length} messages`);
      } catch (error) {
        console.error('❌ [MessageList] Failed to load history:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    /**
     * 滚动到底部
     */
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    /**
     * 刷新消息列表
     */
    const refresh = useCallback(() => {
      console.log(`🔄 [MessageList] Refreshing messages for channel ${channelId}`);
      messageSync.clearChannel(channelId);
      loadHistory();
    }, [channelId]);

    /**
     * 获取当前消息
     */
    const getMessages = useCallback(() => {
      return messages;
    }, [messages]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      refresh,
      getMessages,
    }));

    // 初始加载
    useEffect(() => {
      console.log(`🔄 [MessageList] Switching to channel ${channelId}`);
      messageSync.clearChannel(channelId);
      loadHistory();

      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, [channelId]);

    // WebSocket 房间管理
    useEffect(() => {
      if (!socket || !connected) {
        console.log(`⏳ [MessageList] WebSocket not ready, waiting...`);
        return;
      }

      console.log(`🏠 [MessageList] Joining channel ${channelId}`);
      joinChannel(channelId, userId);

      // 监听消息更新
      const unsubscribe = messageSync.onMessage((msgChannelId, message) => {
        if (msgChannelId === channelId) {
          console.log(`📨 [MessageList] New message for current channel: ${message.id}`);
          setMessages(prev => {
            // 检查是否已存在
            if (prev.some(m => m.id === message.id)) {
              console.log(`⚠️ [MessageList] Message ${message.id} already exists, skipping`);
              return prev;
            }
            console.log(`✅ [MessageList] Adding new message ${message.id} to list`);
            const updated = [...prev, message];
            updated.sort((a, b) => a.seq - b.seq);
            return updated;
          });
        }
      });

      return () => {
        console.log(`🚪 [MessageList] Leaving channel ${channelId}`);
        leaveChannel(channelId, userId);
        unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, connected, channelId, userId]);

    // 新消息时滚动到底部
    useEffect(() => {
      if (!isLoading) {
        scrollToBottom();
      }
    }, [messages, isLoading]);

    return (
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {/* 加载状态 */}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-text-muted">
              <div className="mb-2 text-2xl animate-pulse">⏳</div>
              <p className="text-sm">加载消息中...</p>
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-text-muted">
              <div className="mb-2 text-4xl">💬</div>
              <p className="text-sm">暂无消息</p>
              <p className="mt-1 text-xs">发送第一条消息开始聊天吧！</p>
            </div>
          </div>
        )}

        {/* 消息列表 */}
        {!isLoading && messages.length > 0 && (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const showDate = index === 0 ||
                new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString();

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="my-4 text-center">
                      <span className="text-xs text-text-muted">
                        {new Date(message.createdAt).toLocaleDateString('zh-CN', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long',
                        })}
                      </span>
                    </div>
                  )}
                  <MessageItem message={message} currentUserId={userId} />
                </div>
              );
            })}
          </div>
        )}

        {/* 消息列表末尾 */}
        <div ref={messagesEndRef} />
      </div>
    );
  }
);

/**
 * 单条消息组件
 */
interface MessageItemProps {
  message: Message;
  currentUserId: string;
}

function MessageItem({ message, currentUserId }: MessageItemProps) {
  const isCurrentUser = message.userId === currentUserId;

  return (
    <div className={`flex gap-2.5 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div className="flex-shrink-0 self-end">
        {message.avatar ? (
          <img
            src={message.avatar}
            alt={message.username}
            className="w-9 h-9 rounded-full"
          />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
            isCurrentUser
              ? 'bg-primary/20 text-primary'
              : 'bg-bg-tertiary text-text-muted'
          }`}>
            {(message.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={`max-w-[70%] min-w-0 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 用户名和时间 */}
        <div className={`flex items-baseline gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
          <span className={`text-xs font-medium ${isCurrentUser ? 'text-success' : 'text-text-muted'}`}>
            {isCurrentUser ? '我' : message.username}
          </span>
          <span className="text-[10px] text-text-muted/60">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
          {message.seq > 0 && (
            <span className="text-[10px] text-text-muted/40">
              #{message.seq}
            </span>
          )}
        </div>

        {/* 消息气泡 */}
        <div className={`rounded-2xl px-3.5 py-2 shadow-sm ${
          isCurrentUser
            ? 'bg-success text-white rounded-br-sm'
            : 'bg-bg-tertiary text-text-normal rounded-bl-sm'
        }`}>
          <p className="break-words text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
