// frontend/src/hooks/useRealtimeChannels.ts

import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseRealtimeChannelsOptions {
  userId: string;
  token?: string;
  onChannelCreated?: (channel: any) => void;
  onMessageReceived?: (data: any) => void;
  onMemberJoined?: (data: any) => void;
  onMemberLeft?: (data: any) => void;
}

/**
 * 实时频道更新 Hook
 * 监听 WebSocket 事件并触发回调
 */
export function useRealtimeChannels({
  userId,
  token,
  onChannelCreated,
  onMessageReceived,
  onMemberJoined,
  onMemberLeft,
}: UseRealtimeChannelsOptions) {
  const { connected, on, off } = useWebSocket({ userId, token });
  const listenersRef = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!connected) {
      console.log('⏳ WebSocket 未连接，等待连接...');
      return;
    }

    console.log('✅ WebSocket 已连接，设置监听器...');

    // 监听频道创建事件
    const handleChannelCreated = (data: any) => {
      console.log('📢 收到频道创建事件:', data);
      if (onChannelCreated) {
        onChannelCreated(data);
      }
      // 触发全局刷新事件
      window.dispatchEvent(new CustomEvent('channelsChanged'));
    };

    // 监听新消息事件
    const handleMessageNew = (data: any) => {
      console.log('💬 收到新消息事件:', data);
      if (onMessageReceived) {
        onMessageReceived(data);
      }
      // 触发消息更新事件
      window.dispatchEvent(new CustomEvent('messageReceived', { detail: data }));
    };

    // 监听成员加入事件
    const handleMemberJoined = (data: any) => {
      console.log('👥 收到成员加入事件:', data);
      if (onMemberJoined) {
        onMemberJoined(data);
      }
      // 触发成员更新事件
      window.dispatchEvent(new CustomEvent('memberJoined', { detail: data }));
    };

    // 监听成员离开事件
    const handleMemberLeft = (data: any) => {
      console.log('👋 收到成员离开事件:', data);
      if (onMemberLeft) {
        onMemberLeft(data);
      }
      // 触发成员更新事件
      window.dispatchEvent(new CustomEvent('memberLeft', { detail: data }));
    };

    // 注册所有监听器
    on('channel:created', handleChannelCreated);
    on('message:new', handleMessageNew);
    on('member:joined', handleMemberJoined);
    on('member:left', handleMemberLeft);

    // 保存监听器引用以便清理
    listenersRef.current.set('channel:created', handleChannelCreated);
    listenersRef.current.set('message:new', handleMessageNew);
    listenersRef.current.set('member:joined', handleMemberJoined);
    listenersRef.current.set('member:left', handleMemberLeft);

    console.log('✅ 所有实时事件监听器已设置');

    // 清理函数
    return () => {
      console.log('🧹 清理实时事件监听器...');
      off('channel:created', handleChannelCreated);
      off('message:new', handleMessageNew);
      off('member:joined', handleMemberJoined);
      off('member:left', handleMemberLeft);
      listenersRef.current.clear();
    };
  }, [connected, on, off, onChannelCreated, onMessageReceived, onMemberJoined, onMemberLeft]);

  return {
    connected,
  };
}
