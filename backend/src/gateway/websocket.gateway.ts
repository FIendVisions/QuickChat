// backend/src/gateway/websocket.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * WebSocket Gateway
 * 处理实时通信
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

    if (userId) {
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)!.add(client.id);

      // 通知其他用户该用户上线
      this.server.emit('user:online', {
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);

    if (userId) {
      const userClients = this.connectedClients.get(userId);
      if (userClients) {
        userClients.delete(client.id);

        // 如果用户没有其他连接，通知其他用户该用户离线
        if (userClients.size === 0) {
          this.connectedClients.delete(userId);
          this.server.emit('user:offline', {
            userId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId: string): string[] {
    return Array.from(this.connectedClients.get(userId) || []);
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    const connections = this.connectedClients.get(userId);
    return connections && connections.size > 0;
  }

  /**
   * 发送消息到特定频道
   * 使用Socket.IO的房间功能，确保消息只发送给频道内的用户
   */
  sendToChannel(channelId: string, event: string, data: any) {
    // 使用房间名称格式，确保只广播给加入该房间的用户
    const roomName = `channel:${channelId}`;

    this.logger.log(`📡 [BROADCAST] Broadcasting to room "${roomName}"`);
    this.logger.log(`📡 [BROADCAST] Event: "${event}"`);
    this.logger.log(`📡 [BROADCAST] Data: ${JSON.stringify(data).substring(0, 100)}...`);

    // 广播到房间
    this.server.to(roomName).emit(event, data);

    this.logger.log(`✅ [BROADCAST] Message sent to room "${roomName}"`);
  }

  /**
   * 广播消息到所有连接的客户端
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  /**
   * 发送消息到特定用户
   */
  sendToUser(userId: string, event: string, data: any) {
    const connections = this.getUserConnections(userId);
    connections.forEach(socketId => {
      this.server.to(socketId).emit(event, data);
    });
  }

  // ========== 频道相关 ==========

  @SubscribeMessage('join:channel')
  handleJoinChannel(client: Socket, payload: { channelId: string; userId: string }) {
    const { channelId, userId } = payload;
    const roomName = `channel:${channelId}`;

    this.logger.log(`🏠 [JOIN] User ${userId} joining room ${roomName}`);
    this.logger.log(`🏠 [JOIN] Socket ID: ${client.id}`);

    client.join(roomName);

    this.logger.log(`✅ [JOIN] User ${userId} joined room ${roomName}`);

    // 通知频道内的其他用户
    client.to(roomName).emit('member:joined', {
      channelId,
      userId,
      timestamp: new Date().toISOString(),
    });

    return { event: 'joined', data: { channelId } };
  }

  @SubscribeMessage('leave:channel')
  handleLeaveChannel(client: Socket, payload: { channelId: string; userId: string }) {
    const { channelId, userId } = payload;
    const roomName = `channel:${channelId}`;

    this.logger.log(`🚪 [LEAVE] User ${userId} leaving room ${roomName}`);
    this.logger.log(`🚪 [LEAVE] Socket ID: ${client.id}`);

    client.leave(roomName);

    this.logger.log(`✅ [LEAVE] User ${userId} left room ${roomName}`);

    // 通知频道内的其他用户
    client.to(roomName).emit('member:left', {
      channelId,
      userId,
      timestamp: new Date().toISOString(),
    });

    return { event: 'left', data: { channelId } };
  }

  // ========== 消息相关 ==========

  @SubscribeMessage('message:send')
  handleMessageSend(client: Socket, payload: { channelId: string; userId: string; content: string }) {
    const { channelId, userId, content } = payload;
    this.logger.log(`Message sent in channel ${channelId} by user ${userId}`);

    // 广播到频道内的所有用户（包括发送者）
    this.server.to(`channel:${channelId}`).emit('message:new', {
      channelId,
      userId,
      content,
      timestamp: new Date().toISOString(),
    });

    return { event: 'message_sent', data: { channelId, userId } };
  }

  // ========== 状态更新 ==========

  @SubscribeMessage('status:update')
  handleStatusUpdate(client: Socket, payload: { userId: string; status: string }) {
    const { userId, status } = payload;
    this.logger.log(`User ${userId} status updated to ${status}`);

    // 广播到所有用户
    this.server.emit('user:status', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });

    return { event: 'status_updated', data: { userId, status } };
  }
}
