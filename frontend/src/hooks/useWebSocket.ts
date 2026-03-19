// frontend/src/hooks/useWebSocket.ts

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  userId: string;
  token?: string;
}

interface WebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
  once: (event: string, callback: (data: any) => void) => void;
}

export function useWebSocket({ userId, token }: UseWebSocketOptions): WebSocketReturn {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

    // 使用 Socket.IO 客户端
    const socket = io(wsUrl, {
      auth: {
        userId,
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      socket.disconnect();
    };
  }, [userId, token]);

  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket.IO not connected, cannot emit:', event);
    }
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string, callback: (data: any) => void) => {
    socketRef.current?.off(event, callback);
  };

  const once = (event: string, callback: (data: any) => void) => {
    socketRef.current?.once(event, callback);
  };

  return {
    socket: socketRef.current,
    connected,
    emit,
    on,
    off,
    once,
  };
}
