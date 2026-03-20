// frontend/src/contexts/WebSocketContext.v2.tsx

'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getMessageSyncManager, Message } from '@/services/messageSync/MessageSyncManager';
import { getWsOrigin } from '@/lib/serverOrigin';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinChannel: (channelId: string, userId: string) => void;
  leaveChannel: (channelId: string, userId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  joinChannel: () => {},
  leaveChannel: () => {},
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: ReactNode;
  userId: string;
  token?: string;
}

export function WebSocketProviderV2({ children, userId, token }: WebSocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messageSyncRef = useRef(getMessageSyncManager());
  const joinedChannels = useRef<Set<string>>(new Set());
  const messageHandlersRef = useRef<Map<string, Function>>(new Map());

  useEffect(() => {
    if (!userId) {
      console.log('⏳ [WebSocket] No userId, skipping connection');
      return;
    }

    const wsUrl = getWsOrigin();

    console.log('🔌 ========== [WebSocket] Creating connection ==========');
    console.log('🔌 [WebSocket] URL:', wsUrl);
    console.log('🔌 [WebSocket] User ID:', userId);

    const socket = io(wsUrl, {
      auth: { userId, token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // 清理旧的监听器
    const cleanupListeners = () => {
      if (socketRef.current) {
        const oldSocket = socketRef.current;
        messageHandlersRef.current.forEach((handler, event) => {
          oldSocket.off(event, handler as any);
        });
        messageHandlersRef.current.clear();
      }
    };

    socket.on('connect', () => {
      console.log('✅ ========== [WebSocket] Connected ==========');
      console.log('✅ [WebSocket] Socket ID:', socket.id);
      console.log('✅ [WebSocket] Connected:', socket.connected);
      console.log('✅ [WebSocket] User ID:', userId);
      console.log('✅ [WebSocket] Transport:', socket.io.engine.transport.name);
      setConnected(true);

      // 重新加入所有频道
      joinedChannels.current.forEach(channelId => {
        console.log(`🔄 [WebSocket] Re-joining channel ${channelId}`);
        socket.emit('join:channel', { channelId, userId });
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [WebSocket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [WebSocket] Connection error:', error);
    });

    // 监听新消息
    const handleMessageNew = (data: any) => {
      console.log('🔥🔥🔥 [WebSocket] Received message:new event');
      console.log('🔥🔥🔥 [WebSocket] Message ID:', data.id);
      console.log('🔥🔥🔥 [WebSocket] Channel ID:', data.channelId);
      console.log('🔥🔥🔥 [WebSocket] Sequence:', data.seq);
      console.log('🔥🔥🔥 [WebSocket] Content:', data.content);

      const message: Message = {
        id: data.id,
        seq: data.seq,
        channelId: data.channelId,
        userId: data.userId,
        username: data.username,
        avatar: data.avatar,
        content: data.content,
        type: data.type,
        status: data.status || 'SENT',
        createdAt: data.createdAt,
      };

      // 添加到消息同步管理器
      messageSyncRef.current.addMessageToQueue(data.channelId, message);

      // 触发全局事件（向后兼容）
      window.dispatchEvent(new CustomEvent('ws:message:new', { detail: message }));
    };

    socket.on('message:new', handleMessageNew);
    messageHandlersRef.current.set('message:new', handleMessageNew);

    // 监听房间信息
    const handleRoomInfo = (data: any) => {
      console.log('🏠 [WebSocket] Room info:', data);
    };
    socket.on('room:info', handleRoomInfo);
    messageHandlersRef.current.set('room:info', handleRoomInfo);

    // 监听成员加入/离开
    const handleMemberJoined = (data: any) => {
      console.log('👋 [WebSocket] Member joined:', data);
    };
    socket.on('member:joined', handleMemberJoined);
    messageHandlersRef.current.set('member:joined', handleMemberJoined);

    const handleMemberLeft = (data: any) => {
      console.log('👋 [WebSocket] Member left:', data);
    };
    socket.on('member:left', handleMemberLeft);
    messageHandlersRef.current.set('member:left', handleMemberLeft);

    // 调试：监听所有事件
    socket.onAny((eventName, ...args) => {
      if (eventName.includes('message') || eventName.includes('channel') || eventName.includes('member')) {
        console.log(`🔍 [WebSocket] Event: ${eventName}`, args[0]);
      }
    });

    // 清理旧的监听器
    cleanupListeners();

    socketRef.current = socket;

    return () => {
      console.log('🔌 [WebSocket] Disconnecting...');
      // 移除所有监听器
      messageHandlersRef.current.forEach((handler, event) => {
        socket.off(event, handler as any);
      });
      messageHandlersRef.current.clear();
      socket.disconnect();
    };
  }, [userId, token]);

  /**
   * 加入频道
   */
  const joinChannel = (channelId: string, userId: string) => {
    if (!socketRef.current) {
      console.warn('⚠️ [WebSocket] Cannot join channel: no socket');
      return;
    }

    console.log(`🏠 [WebSocket] Joining channel ${channelId}`);
    socketRef.current.emit('join:channel', { channelId, userId });
    joinedChannels.current.add(channelId);
  };

  /**
   * 离开频道
   */
  const leaveChannel = (channelId: string, userId: string) => {
    if (!socketRef.current) {
      console.warn('⚠️ [WebSocket] Cannot leave channel: no socket');
      return;
    }

    console.log(`🚪 [WebSocket] Leaving channel ${channelId}`);
    socketRef.current.emit('leave:channel', { channelId, userId });
    joinedChannels.current.delete(channelId);
    messageSyncRef.current.clearChannel(channelId);
  };

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, connected, joinChannel, leaveChannel }}>
      {children}
    </WebSocketContext.Provider>
  );
}
