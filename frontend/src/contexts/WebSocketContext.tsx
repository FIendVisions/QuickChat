// frontend/src/contexts/WebSocketContext.tsx

'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

interface WebSocketProviderProps {
  children: ReactNode;
  userId: string;
  token?: string;
}

export function WebSocketProvider({ children, userId, token }: WebSocketProviderProps) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    console.log('🔌 创建全局 WebSocket 连接, URL:', wsUrl, 'User:', userId);

    const socket = io(wsUrl, {
      auth: { userId, token },
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO 已连接, ID:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO 断开:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO 连接错误:', error);
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 断开全局 WebSocket 连接');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, token]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
