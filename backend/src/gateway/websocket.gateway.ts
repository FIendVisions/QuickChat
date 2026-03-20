import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MediasoupService } from '../mediasoup/mediasoup.service';

@WebSocketGateway({
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? (['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL].filter(
            Boolean,
          ) as string[])
        : true,
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedClients = new Map<string, Set<string>>();

  /** 各频道内「正在直播」的用户（内存态，刷新后加入者可收到快照） */
  private channelMediaStates = new Map<
    string,
    Map<string, { username: string; screen: boolean; camera: boolean }>
  >();

  constructor(private readonly mediasoup: MediasoupService) {}

  private getMediaMap(channelId: string) {
    if (!this.channelMediaStates.has(channelId)) {
      this.channelMediaStates.set(channelId, new Map());
    }
    return this.channelMediaStates.get(channelId)!;
  }

  private removeUserMediaState(channelId: string, userId: string) {
    const m = this.channelMediaStates.get(channelId);
    if (!m?.has(userId)) return;
    m.delete(userId);
    this.server.to(`channel:${channelId}`).emit('channel:media:state', {
      channelId,
      userId,
      username: '',
      screen: false,
      camera: false,
      ts: Date.now(),
    });
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

    if (userId) {
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId)!.add(client.id);

      this.server.emit('user:online', {
        userId,
        socketId: client.id,
        timestamp: new Date().toISOString(),
      });
    }

    this.registerSfuHandlers(client, userId);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);

    if (userId) {
      const rooms = Array.from(client.rooms);
      for (const r of rooms) {
        if (r.startsWith('channel:')) {
          const channelId = r.slice('channel:'.length);
          this.removeUserMediaState(channelId, userId);
        }
      }

      const userClients = this.connectedClients.get(userId);
      if (userClients) {
        userClients.delete(client.id);

        if (userClients.size === 0) {
          this.connectedClients.delete(userId);
          this.server.emit('user:offline', {
            userId,
            timestamp: new Date().toISOString(),
          });

          const closedProducers = this.mediasoup.cleanupUser(userId);
          for (const cp of closedProducers) {
            this.server
              .to(`live:${cp.channelId}:${cp.userId}`)
              .emit('sfu:producerClosed', {
                producerId: cp.producerId,
                channelId: cp.channelId,
                userId: cp.userId,
              });
          }
        }
      }
    }
  }

  // ===== SFU signaling (registered per-socket for native Socket.IO ack support) =====

  private registerSfuHandlers(client: Socket, userId: string) {
    if (!userId) return;

    client.on(
      'sfu:getRouterRtpCapabilities',
      (callback: (data: any) => void) => {
        if (typeof callback !== 'function') return;
        callback(this.mediasoup.getRouterRtpCapabilities());
      },
    );

    client.on(
      'sfu:createProducerTransport',
      async (
        payload: { channelId: string },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          const params = await this.mediasoup.createWebRtcTransport(
            userId,
            payload.channelId,
          );
          callback({ ok: true, data: params });
        } catch (e: any) {
          this.logger.warn(`createProducerTransport failed: ${e.message}`);
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:createConsumerTransport',
      async (
        payload: { channelId: string },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          const params = await this.mediasoup.createWebRtcTransport(
            userId,
            payload.channelId,
          );
          callback({ ok: true, data: params });
        } catch (e: any) {
          this.logger.warn(`createConsumerTransport failed: ${e.message}`);
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:connectTransport',
      async (
        payload: { transportId: string; dtlsParameters: any },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          await this.mediasoup.connectTransport(
            payload.transportId,
            payload.dtlsParameters,
          );
          callback({ ok: true });
        } catch (e: any) {
          this.logger.warn(`connectTransport failed: ${e.message}`);
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:produce',
      async (
        payload: {
          transportId: string;
          kind: string;
          rtpParameters: any;
          appData: Record<string, any>;
        },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          const appData: Record<string, any> = { ...payload.appData, userId };
          const producerId = await this.mediasoup.produce(
            payload.transportId,
            payload.kind as 'audio' | 'video',
            payload.rtpParameters,
            appData,
          );

          const channelId = appData.channelId as string;
          this.server
            .to(`live:${channelId}:${userId}`)
            .emit('sfu:newProducer', {
              producerId,
              kind: payload.kind,
              appData,
            });

          callback({ ok: true, data: { producerId } });
        } catch (e: any) {
          this.logger.warn(`produce failed: ${e.message}`);
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:consume',
      async (
        payload: {
          transportId: string;
          producerId: string;
          rtpCapabilities: any;
        },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          const result = await this.mediasoup.consume(
            payload.transportId,
            payload.producerId,
            payload.rtpCapabilities,
          );
          callback({ ok: true, data: result });
        } catch (e: any) {
          this.logger.warn(`consume failed: ${e.message}`);
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:resumeConsumer',
      async (
        payload: { consumerId: string },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        try {
          await this.mediasoup.resumeConsumer(payload.consumerId);
          callback({ ok: true });
        } catch (e: any) {
          callback({ ok: false, error: e.message });
        }
      },
    );

    client.on(
      'sfu:getProducers',
      (
        payload: { channelId: string; broadcasterUserId: string },
        callback: (data: any) => void,
      ) => {
        if (typeof callback !== 'function') return;
        const producers = this.mediasoup.getProducersForUser(
          payload.channelId,
          payload.broadcasterUserId,
        );
        callback({ ok: true, data: producers });
      },
    );

    client.on(
      'sfu:closeProducer',
      (
        payload: { producerId: string },
        callback?: (data: any) => void,
      ) => {
        const info = this.mediasoup.closeProducer(payload.producerId);
        if (info) {
          this.server
            .to(`live:${info.channelId}:${info.userId}`)
            .emit('sfu:producerClosed', {
              producerId: payload.producerId,
              channelId: info.channelId,
              userId: info.userId,
            });
        }
        if (typeof callback === 'function') callback({ ok: true });
      },
    );

    client.on(
      'sfu:joinLiveRoom',
      (payload: { channelId: string; broadcasterUserId: string }) => {
        const roomName = `live:${payload.channelId}:${payload.broadcasterUserId}`;
        client.join(roomName);
      },
    );

    client.on(
      'sfu:leaveLiveRoom',
      (payload: { channelId: string; broadcasterUserId: string }) => {
        const roomName = `live:${payload.channelId}:${payload.broadcasterUserId}`;
        client.leave(roomName);
      },
    );
  }

  // ===== Helpers =====

  getUserConnections(userId: string): string[] {
    return Array.from(this.connectedClients.get(userId) || []);
  }

  isUserOnline(userId: string): boolean {
    const connections = this.connectedClients.get(userId);
    return !!(connections && connections.size > 0);
  }

  sendToChannel(channelId: string, event: string, data: any) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  sendToUser(userId: string, event: string, data: any) {
    const connections = this.getUserConnections(userId);
    connections.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }

  private isUserInChannelRoom(userId: string, channelId: string): boolean {
    const roomName = `channel:${channelId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);
    if (!room || room.size === 0) return false;
    const sids = this.getUserConnections(userId);
    return sids.some((sid) => room.has(sid));
  }

  // ========== 频道相关 ==========

  @SubscribeMessage('join:channel')
  handleJoinChannel(client: Socket, payload: { channelId: string; userId: string }) {
    const { channelId, userId } = payload;
    const roomName = `channel:${channelId}`;

    client.join(roomName);

    const mediaMap = this.getMediaMap(channelId);
    const states = Array.from(mediaMap.entries()).map(([uid, v]) => ({
      userId: uid,
      username: v.username,
      screen: v.screen,
      camera: v.camera,
    }));
    client.emit('channel:media:snapshot', { channelId, states });

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
    const socketUserId = client.handshake.query.userId as string;
    const roomName = `channel:${channelId}`;

    client.leave(roomName);

    if (socketUserId) {
      this.removeUserMediaState(channelId, socketUserId);
    }

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

    this.server.emit('user:status', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });

    return { event: 'status_updated', data: { userId, status } };
  }

  // ========== 直播：媒体状态广播 ==========

  @SubscribeMessage('channel:media:state')
  handleChannelMediaState(
    client: Socket,
    payload: {
      channelId: string;
      userId: string;
      username?: string;
      screen: boolean;
      camera: boolean;
    },
  ) {
    const socketUserId = client.handshake.query.userId as string;
    if (!socketUserId || socketUserId !== payload.userId) {
      return { ok: false, error: 'forbidden' };
    }
    const roomName = `channel:${payload.channelId}`;
    if (!client.rooms.has(roomName)) {
      return { ok: false, error: 'not_in_channel' };
    }

    const mediaMap = this.getMediaMap(payload.channelId);
    if (!payload.screen && !payload.camera) {
      mediaMap.delete(payload.userId);
    } else {
      mediaMap.set(payload.userId, {
        username: payload.username || '用户',
        screen: !!payload.screen,
        camera: !!payload.camera,
      });
    }

    this.server.to(roomName).emit('channel:media:state', {
      channelId: payload.channelId,
      userId: payload.userId,
      username: payload.username || '用户',
      screen: !!payload.screen,
      camera: !!payload.camera,
      ts: Date.now(),
    });
    return { ok: true };
  }

  // ========== Legacy P2P WebRTC signaling (kept for compatibility) ==========

  @SubscribeMessage('webrtc:watch-request')
  handleWebrtcWatchRequest(client: Socket, payload: { channelId: string; targetUserId: string }) {
    const fromUserId = client.handshake.query.userId as string;
    const { channelId, targetUserId } = payload;
    if (!fromUserId || !targetUserId || fromUserId === targetUserId) {
      return { ok: false, error: 'bad_request' };
    }
    const roomName = `channel:${channelId}`;
    if (!client.rooms.has(roomName)) {
      return { ok: false, error: 'not_in_channel' };
    }
    if (!this.isUserInChannelRoom(targetUserId, channelId)) {
      return { ok: false, error: 'target_not_in_channel' };
    }

    this.sendToUser(targetUserId, 'webrtc:watch-request', {
      channelId,
      fromUserId,
    });
    return { ok: true };
  }

  @SubscribeMessage('webrtc:watch-stop')
  handleWebrtcWatchStop(client: Socket, payload: { channelId: string; targetUserId: string }) {
    const fromUserId = client.handshake.query.userId as string;
    const { channelId, targetUserId } = payload;
    if (!fromUserId || !targetUserId) {
      return { ok: false, error: 'bad_request' };
    }
    const roomName = `channel:${channelId}`;
    if (!client.rooms.has(roomName)) {
      return { ok: false, error: 'not_in_channel' };
    }

    this.sendToUser(targetUserId, 'webrtc:watch-stop', {
      channelId,
      fromUserId,
    });
    return { ok: true };
  }

  @SubscribeMessage('webrtc:signal')
  handleWebrtcSignal(
    client: Socket,
    payload: {
      channelId: string;
      toUserId: string;
      type: string;
      sdp?: { type?: string; sdp?: string };
      candidate?: Record<string, unknown>;
    },
  ) {
    const fromUserId = client.handshake.query.userId as string;
    const { channelId, toUserId, type, sdp, candidate } = payload;
    if (!fromUserId || !toUserId || !type) {
      return { ok: false, error: 'bad_request' };
    }
    const roomName = `channel:${channelId}`;
    if (!client.rooms.has(roomName)) {
      return { ok: false, error: 'not_in_channel' };
    }
    if (!this.isUserInChannelRoom(toUserId, channelId)) {
      return { ok: false, error: 'peer_not_in_channel' };
    }

    this.sendToUser(toUserId, 'webrtc:signal', {
      channelId,
      fromUserId,
      type,
      sdp,
      candidate,
    });
    return { ok: true };
  }
}
