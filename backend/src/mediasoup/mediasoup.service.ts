import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { networkInterfaces } from 'os';

function getLocalIpv4(): string {
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediasoupService.name);
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;

  private transports = new Map<string, mediasoup.types.WebRtcTransport>();
  private producers = new Map<string, mediasoup.types.Producer>();
  private consumers = new Map<string, mediasoup.types.Consumer>();

  /** channelId → userId → Set<producerId> */
  private channelUserProducers = new Map<
    string,
    Map<string, Set<string>>
  >();

  /** transportId → owner info */
  private transportOwners = new Map<
    string,
    { userId: string; channelId: string }
  >();

  /** userId → Set<transportId> */
  private userTransports = new Map<string, Set<string>>();

  async onModuleInit() {
    await this.initWorkerAndRouter();
  }

  onModuleDestroy() {
    this.worker?.close();
  }

  private async initWorkerAndRouter() {
    this.worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 10000,
      rtcMaxPort: 10200,
    });

    this.worker.on('died', () => {
      this.logger.error('mediasoup Worker died, restarting in 2 s…');
      setTimeout(() => this.initWorkerAndRouter(), 2000);
    });

    this.router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });

    this.logger.log('mediasoup Worker + Router ready');
  }

  getRouterRtpCapabilities(): mediasoup.types.RtpCapabilities {
    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(userId: string, channelId: string) {
    const announcedIp =
      process.env.MEDIASOUP_ANNOUNCED_IP || getLocalIpv4();

    const transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000,
    });

    this.transports.set(transport.id, transport);
    this.transportOwners.set(transport.id, { userId, channelId });

    if (!this.userTransports.has(userId)) {
      this.userTransports.set(userId, new Set());
    }
    this.userTransports.get(userId)!.add(transport.id);

    transport.on('dtlsstatechange', (state) => {
      if (state === 'closed') this.removeTransport(transport.id);
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    transportId: string,
    dtlsParameters: mediasoup.types.DtlsParameters,
  ) {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');
    await transport.connect({ dtlsParameters });
  }

  async produce(
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
    appData: Record<string, any>,
  ): Promise<string> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData,
    });

    this.producers.set(producer.id, producer);

    const channelId = appData.channelId as string;
    const userId = appData.userId as string;

    if (!this.channelUserProducers.has(channelId)) {
      this.channelUserProducers.set(channelId, new Map());
    }
    const userMap = this.channelUserProducers.get(channelId)!;
    if (!userMap.has(userId)) {
      userMap.set(userId, new Set());
    }
    userMap.get(userId)!.add(producer.id);

    producer.on('transportclose', () => {
      this.producers.delete(producer.id);
      userMap.get(userId)?.delete(producer.id);
    });

    this.logger.log(
      `Producer ${producer.id} (${kind}/${appData.source}) — user ${userId}, channel ${channelId}`,
    );
    return producer.id;
  }

  async consume(
    consumerTransportId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities,
  ) {
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume — incompatible RTP capabilities');
    }

    const transport = this.transports.get(consumerTransportId);
    if (!transport) throw new Error('Consumer transport not found');

    const producer = this.producers.get(producerId);
    if (!producer) throw new Error('Producer not found');

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    this.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      this.consumers.delete(consumer.id);
    });
    consumer.on('producerclose', () => {
      this.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: producer.appData,
    };
  }

  async resumeConsumer(consumerId: string) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) throw new Error('Consumer not found');
    await consumer.resume();
  }

  getProducersForUser(channelId: string, userId: string) {
    const userMap = this.channelUserProducers.get(channelId);
    if (!userMap) return [];
    const pids = userMap.get(userId);
    if (!pids) return [];

    const result: Array<{
      producerId: string;
      kind: string;
      appData: Record<string, any>;
    }> = [];

    for (const pid of pids) {
      const p = this.producers.get(pid);
      if (p && !p.closed) {
        result.push({
          producerId: p.id,
          kind: p.kind,
          appData: p.appData as Record<string, any>,
        });
      }
    }
    return result;
  }

  closeProducer(
    producerId: string,
  ): { channelId: string; userId: string } | null {
    const producer = this.producers.get(producerId);
    if (!producer) return null;

    const appData = producer.appData as Record<string, any>;
    const channelId = appData.channelId as string;
    const userId = appData.userId as string;

    producer.close();
    this.producers.delete(producerId);
    this.channelUserProducers.get(channelId)?.get(userId)?.delete(producerId);

    return { channelId, userId };
  }

  private removeTransport(transportId: string) {
    const transport = this.transports.get(transportId);
    if (!transport) return;
    try {
      transport.close();
    } catch {
      /* already closed */
    }
    this.transports.delete(transportId);

    const owner = this.transportOwners.get(transportId);
    if (owner) {
      this.transportOwners.delete(transportId);
      this.userTransports.get(owner.userId)?.delete(transportId);
    }
  }

  /** 用户断连时清理所有资源，返回被关闭的 producer 列表供信令通知观众 */
  cleanupUser(
    userId: string,
  ): Array<{ producerId: string; channelId: string; userId: string }> {
    const closed: Array<{
      producerId: string;
      channelId: string;
      userId: string;
    }> = [];

    for (const [channelId, userMap] of this.channelUserProducers) {
      const pids = userMap.get(userId);
      if (!pids) continue;
      for (const pid of [...pids]) {
        const p = this.producers.get(pid);
        if (p && !p.closed) {
          closed.push({ producerId: pid, channelId, userId });
          p.close();
        }
        this.producers.delete(pid);
      }
      userMap.delete(userId);
    }

    const tids = this.userTransports.get(userId);
    if (tids) {
      for (const tid of [...tids]) {
        this.removeTransport(tid);
      }
    }
    this.userTransports.delete(userId);

    return closed;
  }
}
