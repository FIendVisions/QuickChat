// frontend/src/hooks/useRealtimeMessages.ts

import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { messageApi } from '@/services/api/message.api';

interface UseRealtimeMessagesOptions {
  userId: string;
  token?: string;
  channelId: string;
  username: string;
  onMessageReceived?: (message: any) => void;
}

/**
 * 实时消息 Hook
 * 处理消息发送和接收
 */
export function useRealtimeMessages({
  userId,
  token,
  channelId,
  username,
  onMessageReceived,
}: UseRealtimeMessagesOptions) {
  const { connected, emit, on, off } = useWebSocket({ userId, token });

  useEffect(() => {
    if (!connected || !channelId) {
      console.log('⏳ Socket.IO 未连接或频道未设置，跳过消息监听');
      return;
    }

    console.log(`💬 加入频道 ${channelId} 的房间...`);

    // 加入频道房间
    emit('join:channel', {
      channelId,
      userId,
    });

    // 监听频道内的新消息
    const handleMessageNew = (data: any) => {
      console.log('📨 收到新消息:', data);

      // 检查消息是否属于当前频道
      if (data.channelId === channelId && onMessageReceived) {
        onMessageReceived(data);
      }

      // 触发全局消息事件（兼容旧代码）
      window.dispatchEvent(new CustomEvent('newMessage', { detail: data }));
    };

    // 监听成员加入事件
    const handleMemberJoined = (data: any) => {
      console.log('👥 成员加入:', data);
      window.dispatchEvent(new CustomEvent('memberJoined', { detail: data }));
    };

    // 监听成员离开事件
    const handleMemberLeft = (data: any) => {
      console.log('👋 成员离开:', data);
      window.dispatchEvent(new CustomEvent('memberLeft', { detail: data }));
    };

    // 注册监听器
    on('message:new', handleMessageNew);
    on('member:joined', handleMemberJoined);
    on('member:left', handleMemberLeft);

    console.log(`✅ 频道 ${channelId} 的消息监听已设置`);

    // 清理函数
    return () => {
      console.log(`🧹 离开频道 ${channelId} 的房间...`);

      // 离开频道房间
      emit('leave:channel', {
        channelId,
        userId,
      });

      off('message:new', handleMessageNew);
      off('member:joined', handleMemberJoined);
      off('member:left', handleMemberLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, channelId, userId]);

  /**
   * 发送消息
   * 只通过 HTTP API 发送，后端会通过 Socket.IO 广播
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) {
      throw new Error('消息内容不能为空');
    }

    console.log('💬 发送消息到频道:', channelId, '内容:', content);

    try {
      // 仅通过 HTTP API 发送消息
      // 后端 ChannelsService.sendMessage() 会：
      // 1. 持久化到数据库
      // 2. 通过 WebsocketGateway.sendToChannel() 广播到房间
      const message = await messageApi.send(channelId, content, userId, username);

      console.log('✅ 消息已发送并广播:', message);
      return message;
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      throw error;
    }
  }, [channelId, userId, username]);

  return {
    connected,
    sendMessage,
  };
}
