'use client';

import { useEffect, useRef } from 'react';
import { Device } from 'mediasoup-client';
import type { types as msTypes } from 'mediasoup-client';
import type { Socket } from 'socket.io-client';
import { sfuRequest } from '@/lib/sfuSignaling';

interface UseLivePublisherOptions {
  socket: Socket | null;
  channelId: string | null;
  userId: string;
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
  camStreamRef: React.MutableRefObject<MediaStream | null>;
  screenOn: boolean;
  camOn: boolean;
}

/**
 * SFU-based live publisher.
 * Pushes screen/camera streams to the mediasoup SFU server,
 * which then selectively forwards them to viewers.
 */
export function useLivePublisher({
  socket,
  channelId,
  userId,
  screenStreamRef,
  camStreamRef,
  screenOn,
  camOn,
}: UseLivePublisherOptions) {
  const deviceRef = useRef<Device | null>(null);
  const transportRef = useRef<msTypes.Transport | null>(null);
  const producersRef = useRef(new Map<string, msTypes.Producer>());
  const sessionRef = useRef(0);

  useEffect(() => {
    if (!socket?.connected || !channelId) return;

    const closeSources = (sources: string[]) => {
      for (const src of sources) {
        const p = producersRef.current.get(src);
        if (p && !p.closed) {
          socket.emit('sfu:closeProducer', { producerId: p.id });
          p.close();
        }
        producersRef.current.delete(src);
      }
    };

    if (!screenOn && !camOn) {
      closeSources(Array.from(producersRef.current.keys()));
      return;
    }

    const session = ++sessionRef.current;
    const stale = () => session !== sessionRef.current;

    const run = async () => {
      try {
        // --- Device ---
        if (!deviceRef.current) {
          const caps = await sfuRequest(
            socket,
            'sfu:getRouterRtpCapabilities',
          );
          if (stale()) return;
          const dev = new Device();
          await dev.load({
            routerRtpCapabilities: caps as msTypes.RtpCapabilities,
          });
          if (stale()) return;
          deviceRef.current = dev;
        }

        // --- SendTransport ---
        if (!transportRef.current || transportRef.current.closed) {
          const params = await sfuRequest<{
            id: string;
            iceParameters: any;
            iceCandidates: any;
            dtlsParameters: any;
          }>(socket, 'sfu:createProducerTransport', { channelId });
          if (stale()) return;

          const t = deviceRef.current!.createSendTransport(params);

          t.on(
            'connect',
            (
              { dtlsParameters }: any,
              cb: () => void,
              eb: (e: Error) => void,
            ) => {
              sfuRequest(socket, 'sfu:connectTransport', {
                transportId: t.id,
                dtlsParameters,
              })
                .then(() => cb())
                .catch(eb);
            },
          );

          t.on(
            'produce',
            (
              { kind, rtpParameters, appData }: any,
              cb: (arg: { id: string }) => void,
              eb: (e: Error) => void,
            ) => {
              sfuRequest<{ producerId: string }>(socket, 'sfu:produce', {
                transportId: t.id,
                kind,
                rtpParameters,
                appData: { ...appData, channelId, userId },
              })
                .then(({ producerId }) => cb({ id: producerId }))
                .catch(eb);
            },
          );

          if (stale()) {
            t.close();
            return;
          }
          transportRef.current = t;
        }

        const transport = transportRef.current!;

        const produceTrack = async (
          track: MediaStreamTrack,
          source: string,
        ) => {
          const existing = producersRef.current.get(source);
          if (existing && !existing.closed) return;

          const producer = await transport.produce({
            track,
            appData: { source },
          });
          if (stale()) {
            producer.close();
            return;
          }
          producersRef.current.set(source, producer);

          producer.on('trackended', () => {
            if (!producer.closed) {
              producer.close();
              socket.emit('sfu:closeProducer', { producerId: producer.id });
            }
            producersRef.current.delete(source);
          });
        };

        // --- Screen producers ---
        if (screenOn && screenStreamRef.current) {
          for (const track of screenStreamRef.current.getTracks()) {
            if (stale()) return;
            const source =
              track.kind === 'video' ? 'screen-video' : 'screen-audio';
            await produceTrack(track, source);
          }
        } else {
          closeSources(['screen-video', 'screen-audio']);
        }

        // --- Camera producer ---
        if (camOn && camStreamRef.current) {
          const vt = camStreamRef.current.getVideoTracks()[0];
          if (vt && !stale()) {
            await produceTrack(vt, 'camera-video');
          }
        } else {
          closeSources(['camera-video']);
        }
      } catch (e) {
        console.error('[live/publisher] SFU error:', e);
      }
    };

    run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, channelId, userId, screenOn, camOn]);

  // Full cleanup on channel change or unmount
  useEffect(() => {
    return () => {
      producersRef.current.forEach((p) => {
        if (!p.closed) p.close();
      });
      producersRef.current.clear();
      if (transportRef.current && !transportRef.current.closed) {
        transportRef.current.close();
      }
      transportRef.current = null;
      deviceRef.current = null;
    };
  }, [channelId]);
}
