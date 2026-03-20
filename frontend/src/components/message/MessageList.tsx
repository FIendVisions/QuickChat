// frontend/src/components/message/MessageList.tsx

'use client';

import { useEffect, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { messageApi } from '@/services/api/message.api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { resolveUploadUrl } from '@/lib/mediaUrl';
import type { ChatMessage } from '@/types/message.types';

type Message = ChatMessage;

interface MessageListProps {
  channelId: string;
  userId: string;
  onMessagesChange?: (messages: Message[]) => void;
}

export interface MessageListRef {
  addMessage: (message: Message) => void;
  replaceTemp: (tempId: string, realMessage: Message) => void;
  getMessages: () => Message[];
}

/**
 * 消息列表组件
 * 从后端API加载历史消息 + 直接在 socket 上监听实时新消息
 */
export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ channelId, userId, onMessagesChange }, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, connected } = useWebSocket();

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      isLoadingRef.current = true;

      const data = await messageApi.getMessages(channelId, 1, 50);
      const mapped: Message[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username || msg.user?.username || '未知用户',
        avatar: msg.avatar || msg.user?.avatar,
        content: msg.content ?? '',
        createdAt: msg.createdAt,
        type: msg.type || 'TEXT',
        channelId: msg.channelId,
        attachmentUrl:
          msg.attachmentUrl != null && String(msg.attachmentUrl).length > 0
            ? resolveUploadUrl(String(msg.attachmentUrl))
            : undefined,
        attachmentName: msg.attachmentName,
        attachmentMime: msg.attachmentMime,
      }));
      setMessages(mapped);
    } catch (error) {
      console.error('❌ 加载历史消息失败:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * 添加一条新消息（去重全部在 setMessages 回调内完成，保证原子性）
   */
  const addMessage = useCallback((newMessage: Message) => {
    if (isLoadingRef.current) return;

    setMessages((prev) => {
      if (prev.some(m => m.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });
  }, []);

  /**
   * 用真实消息替换临时消息（由发送者调用）
   */
  const replaceTemp = useCallback((tempId: string, realMessage: Message) => {
    setMessages((prev) => {
      if (prev.some(m => m.id === realMessage.id)) {
        return prev.filter(m => m.id !== tempId);
      }
      return prev.map(m => m.id === tempId ? realMessage : m);
    });
  }, []);

  // 初始加载和频道切换
  useEffect(() => {
    loadHistory();
    return () => {
      setMessages([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // WebSocket 房间管理 + 直接监听 message:new
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('join:channel', { channelId, userId });

    const handleMessageNew = (data: any) => {
      if (isLoadingRef.current) return;
      if (data.channelId !== channelId) return;

      if (data.userId === userId) return;

      const normalized: Message = {
        id: data.id,
        channelId: data.channelId,
        userId: data.userId,
        username: data.username || '未知用户',
        avatar: data.avatar,
        content: data.content ?? '',
        type: data.type || 'TEXT',
        createdAt: data.createdAt,
        attachmentUrl:
          data.attachmentUrl != null && String(data.attachmentUrl).length > 0
            ? resolveUploadUrl(String(data.attachmentUrl))
            : undefined,
        attachmentName: data.attachmentName,
        attachmentMime: data.attachmentMime,
      };

      setMessages((prev) => {
        if (prev.some(m => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
    };

    socket.on('message:new', handleMessageNew);

    return () => {
      socket.emit('leave:channel', { channelId, userId });
      socket.off('message:new', handleMessageNew);
    };
  }, [socket, connected, channelId, userId]);

  // 新消息时滚动到底部
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  useImperativeHandle(ref, () => ({
    addMessage,
    replaceTemp,
    getMessages: () => messages,
  }), [addMessage, replaceTemp, messages]);

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
            // 显示日期分隔
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
  const isSystem = message.type === 'SYSTEM';
  const isCurrentUser = message.userId === currentUserId;
  const isImage = message.type === 'IMAGE' || (message.attachmentMime?.startsWith('image/') && message.attachmentUrl);
  const isFile = message.type === 'FILE' || (!!message.attachmentUrl && !isImage);
  const caption = (message.content || '').trim();

  if (isSystem) {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-bg-tertiary/60 px-3 py-0.5 text-xs text-text-muted">
          {message.content}
        </span>
      </div>
    );
  }

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
        </div>

        {/* 消息气泡 */}
        <div
          className={`rounded-2xl px-2 py-1.5 shadow-sm ${
            isCurrentUser
              ? 'bg-success text-white rounded-br-sm'
              : 'bg-bg-tertiary text-text-normal rounded-bl-sm'
          }`}
        >
          {isImage && message.attachmentUrl && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || '图片'}
                className="max-h-64 max-w-full rounded-lg object-contain"
              />
            </a>
          )}
          {isFile && message.attachmentUrl && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              download={message.attachmentName}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm underline ${
                isCurrentUser ? 'text-white/95 hover:text-white' : 'text-primary hover:text-primary/90'
              }`}
            >
              <span>📎</span>
              <span className="truncate">{message.attachmentName || '下载文件'}</span>
            </a>
          )}
          {caption && (
            <p className={`break-words text-sm leading-relaxed ${isImage || isFile ? 'mt-1.5' : ''}`}>
              {caption}
            </p>
          )}
          {!caption && !message.attachmentUrl && (
            <p className="break-words text-sm leading-relaxed opacity-70">（空消息）</p>
          )}
        </div>
      </div>
    </div>
  );
}
