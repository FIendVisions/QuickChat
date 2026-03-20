'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Video } from 'lucide-react';
import { Device } from 'mediasoup-client';
import type { types as msTypes } from 'mediasoup-client';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { sfuRequest } from '@/lib/sfuSignaling';

interface LiveWatchPlayerProps {
  channelId: string;
  viewerUserId: string;
  broadcasterUserId: string;
  broadcasterName: string;
  hasScreen: boolean;
  hasCamera: boolean;
  statusSlot?: React.ReactNode;
}

/**
 * SFU-based live stream viewer.
 * Creates a mediasoup-client Device + RecvTransport and consumes
 * all producers from the broadcaster via the SFU server.
 */
export function LiveWatchPlayer({
  channelId,
  viewerUserId,
  broadcasterUserId,
  broadcasterName,
  hasScreen,
  hasCamera,
  statusSlot,
}: LiveWatchPlayerProps) {
  const { socket, connected } = useWebSocket();
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const deviceRef = useRef<Device | null>(null);
  const recvTransportRef = useRef<msTypes.Transport | null>(null);
  const consumersRef = useRef(new Map<string, msTypes.Consumer>());

  const [status, setStatus] = useState('正在连接…');
  const [hasMainVideo, setHasMainVideo] = useState(false);
  const [hasCamVideo, setHasCamVideo] = useState(false);

  const attachTrack = useCallback(
    (track: MediaStreamTrack, source: string) => {
      if (track.kind === 'video') {
        const isCamera = source === 'camera-video';
        const el = isCamera ? camVideoRef.current : screenVideoRef.current;
        if (el) {
          el.srcObject = new MediaStream([track]);
          el.play().catch(() => {});
          if (isCamera) setHasCamVideo(true);
          else setHasMainVideo(true);
        }
      } else if (track.kind === 'audio') {
        const audio = new Audio();
        audio.srcObject = new MediaStream([track]);
        audio.play().catch(() => {});
        audioRefs.current.push(audio);
      }
    },
    [],
  );

  // Join channel room
  useEffect(() => {
    if (!socket || !connected || !channelId || !viewerUserId) return;
    socket.emit('join:channel', { channelId, userId: viewerUserId });
    return () => {
      if (socket.connected) {
        socket.emit('leave:channel', { channelId, userId: viewerUserId });
      }
    };
  }, [socket, connected, channelId, viewerUserId]);

  // Main SFU connection effect
  useEffect(() => {
    if (!socket || !connected || !channelId || !viewerUserId) return;

    let cancelled = false;

    const consumeProducer = async (
      transport: msTypes.Transport,
      device: Device,
      info: { producerId: string; kind: string; appData: Record<string, any> },
    ) => {
      const params = await sfuRequest<{
        id: string;
        producerId: string;
        kind: string;
        rtpParameters: any;
        appData: Record<string, any>;
      }>(socket, 'sfu:consume', {
        transportId: transport.id,
        producerId: info.producerId,
        rtpCapabilities: device.rtpCapabilities,
      });
      if (cancelled) return;

      const consumer = await transport.consume({
        id: params.id,
        producerId: params.producerId,
        kind: params.kind as msTypes.MediaKind,
        rtpParameters: params.rtpParameters,
      });
      consumersRef.current.set(consumer.id, consumer);

      const source =
        (info.appData?.source as string) ||
        (params.appData?.source as string) ||
        '';
      attachTrack(consumer.track, source);

      await sfuRequest(socket, 'sfu:resumeConsumer', {
        consumerId: consumer.id,
      });

      consumer.on('transportclose', () => {
        consumersRef.current.delete(consumer.id);
      });
    };

    const setup = async () => {
      try {
        setStatus('正在连接…');

        // 1. Router RTP capabilities
        const caps = await sfuRequest(
          socket,
          'sfu:getRouterRtpCapabilities',
        );
        if (cancelled) return;

        // 2. Load device
        const device = new Device();
        await device.load({
          routerRtpCapabilities: caps as msTypes.RtpCapabilities,
        });
        if (cancelled) return;
        deviceRef.current = device;

        // 3. Create receive transport
        const params = await sfuRequest<{
          id: string;
          iceParameters: any;
          iceCandidates: any;
          dtlsParameters: any;
        }>(socket, 'sfu:createConsumerTransport', { channelId });
        if (cancelled) return;

        const transport = device.createRecvTransport(params);

        transport.on(
          'connect',
          (
            { dtlsParameters }: any,
            cb: () => void,
            eb: (e: Error) => void,
          ) => {
            sfuRequest(socket, 'sfu:connectTransport', {
              transportId: transport.id,
              dtlsParameters,
            })
              .then(() => cb())
              .catch(eb);
          },
        );

        if (cancelled) {
          transport.close();
          return;
        }
        recvTransportRef.current = transport;

        // 4. Join live notification room
        socket.emit('sfu:joinLiveRoom', { channelId, broadcasterUserId });

        // 5. Get existing producers
        const producers = await sfuRequest<
          Array<{
            producerId: string;
            kind: string;
            appData: Record<string, any>;
          }>
        >(socket, 'sfu:getProducers', { channelId, broadcasterUserId });
        if (cancelled) return;

        // 6. Consume each producer
        for (const p of producers) {
          if (cancelled) return;
          try {
            await consumeProducer(transport, device, p);
          } catch (e) {
            console.warn('[live/viewer] consume failed for', p.producerId, e);
          }
        }

        if (!cancelled) {
          setStatus(producers.length > 0 ? '直播中' : '等待主播推流…');
        }
      } catch (e: any) {
        console.error('[live/viewer] SFU setup failed:', e);
        if (!cancelled) setStatus('连接失败');
      }
    };

    // New producer notification
    const onNewProducer = async (data: {
      producerId: string;
      kind: string;
      appData: Record<string, any>;
    }) => {
      if (data.appData?.userId !== broadcasterUserId) return;
      if (!deviceRef.current || !recvTransportRef.current || cancelled) return;
      try {
        await consumeProducer(recvTransportRef.current, deviceRef.current, data);
        setStatus('直播中');
      } catch (e) {
        console.warn('[live/viewer] consume new producer failed:', e);
      }
    };

    // Producer closed notification
    const onProducerClosed = (data: {
      producerId: string;
      channelId: string;
      userId: string;
    }) => {
      if (data.userId !== broadcasterUserId) return;
      const entries = Array.from(consumersRef.current.entries());
      for (const [id, consumer] of entries) {
        if (consumer.producerId === data.producerId) {
          consumer.close();
          consumersRef.current.delete(id);
          break;
        }
      }
      if (consumersRef.current.size === 0) {
        setHasMainVideo(false);
        setHasCamVideo(false);
        setStatus('主播已停止直播');
      }
    };

    socket.on('sfu:newProducer', onNewProducer);
    socket.on('sfu:producerClosed', onProducerClosed);

    setup();

    return () => {
      cancelled = true;
      socket.off('sfu:newProducer', onNewProducer);
      socket.off('sfu:producerClosed', onProducerClosed);

      if (socket.connected) {
        socket.emit('sfu:leaveLiveRoom', { channelId, broadcasterUserId });
      }

      consumersRef.current.forEach((c) => c.close());
      consumersRef.current.clear();
      if (recvTransportRef.current && !recvTransportRef.current.closed) {
        recvTransportRef.current.close();
      }
      recvTransportRef.current = null;
      deviceRef.current = null;

      audioRefs.current.forEach((a) => {
        a.pause();
        a.srcObject = null;
      });
      audioRefs.current = [];

      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      if (camVideoRef.current) camVideoRef.current.srcObject = null;
      setHasMainVideo(false);
      setHasCamVideo(false);
    };
  }, [socket, connected, channelId, viewerUserId, broadcasterUserId, attachTrack]);

  const showCamPip = hasScreen && hasCamera;
  const showMainWaiting = (hasScreen || hasCamera) && !hasMainVideo;
  const showCamWaiting = showCamPip && !hasCamVideo;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black">
      {statusSlot ?? (
        <div className="absolute left-3 top-3 z-20 max-w-[min(90%,320px)] rounded-md bg-black/70 px-2 py-1 text-[11px] text-white backdrop-blur-sm">
          <span className="font-medium text-primary">{broadcasterName}</span>
          <span className="ml-2 text-white/80">{status}</span>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <video
            ref={screenVideoRef}
            className="max-h-full max-w-full object-contain"
            playsInline
            muted
            autoPlay
          />
        </div>

        {showMainWaiting && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-sm text-text-muted">
            <span>等待画面…</span>
          </div>
        )}
      </div>

      {showCamPip && (
        <div className="absolute bottom-4 right-4 z-10 w-[min(30%,260px)] overflow-hidden rounded-lg border-2 border-primary/60 bg-black shadow-xl">
          <div className="flex items-center gap-0.5 bg-bg-secondary/95 px-2 py-0.5 text-[10px] text-text-muted">
            <Video size={10} />
            摄像头
          </div>
          <div className="relative aspect-video w-full bg-black">
            <video
              ref={camVideoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {showCamWaiting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-[10px] text-text-muted">
                等待…
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 z-[5] flex gap-2 text-[10px] text-white/70">
        {hasScreen && (
          <span className="flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5">
            <Monitor size={10} />
            屏幕
          </span>
        )}
        {hasCamera && (
          <span className="flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5">
            <Video size={10} />
            摄像头
          </span>
        )}
      </div>
    </div>
  );
}
