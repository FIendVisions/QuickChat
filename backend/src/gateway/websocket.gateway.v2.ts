import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MessageAckService } from '../message-queue/message-ack.service';

/**
 * 改进版 WebSocket Gateway
 * 参考 Discord/Telegram 架构设计
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
})
export class EnhancedWebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EnhancedWebsocketGateway.name);

  // 用户连接映射：userId -> Set of socketIds
  private userConnections = new Map<string, Set<string>>();

  // Socket 用户映射：socketId -> userId
  private socketUsers = new Map<string, string>();

  // 房间成员映射：channelId -> Set of userIds
  private roomMembers = new Map<string, Set<string>>();

  constructor(private messageAckService: MessageAckService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    this.logger.log(`🔌 [CONNECT] Socket ${client.id} connected (User: ${userId || 'anonymous'})`);

    if (userId) {
      // 记录用户连接
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);
      this.socketUsers.set(client.id, userId);

      // 通知其他连接该用户上线
      this.server.emit('user:online', {
        userId,
        socketId: client.id,
        timestamp: Date.now(),
      });

      this.logger.log(`✅ [CONNECT] User ${userId} now has ${this.userConnections.get(userId)!.size} connection(s)`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);

    this.logger.log(`🔌 [DISCONNECT] Socket ${client.id} disconnected (User: ${userId || 'unknown'})`);

    if (userId) {
      // 移除连接
      const connections = this.userConnections.get(userId);
      if (connections) {
        connections.delete(client.id);

        // 如果用户没有其他连接，通知其他用户该用户离线
        if (connections.size === 0) {
          this.userConnections.delete(userId);
          this.server.emit('user:offline', {
            userId,
            timestamp: Date.now(),
          });
          this.logger.log(`📴 [DISCONNECT] User ${userId} is now offline`);
        }
      }

      this.socketUsers.delete(client.id);
    }
  }

  /**
   * 加入频道房间
   */
  @SubscribeMessage('join:channel')
  handleJoinChannel(client: Socket, payload: { channelId: string; userId: string }) {
    const { channelId, userId } = payload;
    const roomName = `channel:${channelId}`;

    this.logger.log(`🏠 [JOIN] User ${userId} joining room ${roomName}`);

    // 加入 Socket.IO 房间
    client.join(roomName);

    // 记录房间成员
    if (!this.roomMembers.has(channelId)) {
      this.roomMembers.set(channelId, new Set());
    }
    this.roomMembers.get(channelId)!.add(userId);

    const memberCount = this.roomMembers.get(channelId)!.size;
    this.logger.log(`✅ [JOIN] Room ${roomName} now has ${memberCount} member(s)`);

    // 通知房间内的其他用户
    client.to(roomName).emit('member:joined', {
      channelId,
      userId,
      memberCount,
      timestamp: Date.now(),
    });

    // 发送当前房间信息给加入的用户
    client.emit('room:info', {
      channelId,
      memberCount,
      members: Array.from(this.roomMembers.get(channelId)!),
    });

    return { event: 'joined', data: { channelId, memberCount } };
  }

  /**
   * 离开频道房间
   */
  @SubscribeMessage('leave:channel')
  handleLeaveChannel(client: Socket, payload: { channelId: string; userId: string }) {
    const { channelId, userId } = payload;
    const roomName = `channel:${channelId}`;

    this.logger.log(`🚪 [LEAVE] User ${userId} leaving room ${roomName}`);

    // 离开 Socket.IO 房间
    client.leave(roomName);

    // 从房间成员中移除
    const members = this.roomMembers.get(channelId);
    if (members) {
      members.delete(userId);

      const memberCount = members.size;
      this.logger.log(`✅ [LEAVE] Room ${roomName} now has ${memberCount} member(s)`);

      // 通知房间内的其他用户
      client.to(roomName).emit('member:left', {
        channelId,
        userId,
        memberCount,
        timestamp: Date.now(),
      });

      // 如果房间为空，清理
      if (memberCount === 0) {
        this.roomMembers.delete(channelId);
        this.messageAckService.cleanup(channelId);
        this.logger.log(`🧹 [LEAVE] Room ${roomName} cleaned up (empty)`);
      }
    }

    return { event: 'left', data: { channelId } };
  }

  /**
   * 发送消息到频道（改进版）
   */
  sendToChannel(channelId: string, event: string, data: any) {
    const roomName = `channel:${channelId}`;

    this.logger.log(`📡 [BROADCAST] Room: ${roomName}, Event: ${event}`);

    // 检查房间成员
    const members = this.roomMembers.get(channelId);
    if (!members || members.size === 0) {
      this.logger.warn(`⚠️ [BROADCAST] Room ${roomName} has no members!`);
      return 0;
    }

    this.logger.log(`👥 [BROADCAST] Broadcasting to ${members.size} member(s)`);

    // 广播到房间
    this.server.to(roomName).emit(event, data);

    return members.size;
  }

  /**
   * 发送消息到特定用户
   */
  sendToUser(userId: string, event: string, data: any) {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      this.logger.warn(`⚠️ [DIRECT] User ${userId} has no active connections`);
      return false;
    }

    this.logger.log(`📤 [DIRECT] Sending ${event} to user ${userId} (${connections.size} connection(s))`);

    connections.forEach(socketId => {
      this.server.to(socketId).emit(event, data);
    });

    return true;
  }

  /**
   * 获取房间信息
   */
  getRoomInfo(channelId: string): { memberCount: number; members: string[] } {
    const members = this.roomMembers.get(channelId);
    return {
      memberCount: members ? members.size : 0,
      members: members ? Array.from(members) : [],
    };
  }

  /**
   * 获取在线用户数
   */
  getOnlineUserCount(): number {
    return this.userConnections.size;
  }

  /**
   * 获取总连接数
   */
  getTotalConnections(): number {
    return this.socketUsers.size;
  }
}
