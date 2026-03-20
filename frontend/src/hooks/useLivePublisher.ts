'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { DEFAULT_ICE_SERVERS } from '@/lib/webrtcConfig';

interface UseLivePublisherOptions {
  socket: Socket | null;
  channelId: string | null;
  userId: string;
  screenStreamRef: React.MutableRefObject<MediaStream | null>;
  camStreamRef: React.MutableRefObject<MediaStream | null>;
}

interface PeerIceMeta {
  pending: RTCIceCandidateInit[];
  remoteAnswerSet: boolean;
}

/**
 * 作为「主播」：响应 webrtc:watch-request，为每个观众建独立 RTCPeerConnection。
 * 观众 ICE 若早于 answer 的 setRemoteDescription 到达，先入队再 flush。
 */
export function useLivePublisher({
  socket,
  channelId,
  userId,
  screenStreamRef,
  camStreamRef,
}: UseLivePublisherOptions) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerIceRef = useRef<Map<string, PeerIceMeta>>(new Map());

  const removePeer = useCallback((viewerId: string) => {
    const pc = peersRef.current.get(viewerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(viewerId);
    }
    peerIceRef.current.delete(viewerId);
  }, []);

  const handleRemoteSignal = useCallback(
    async (data: {
      channelId: string;
      fromUserId: string;
      type: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (!socket || !channelId || data.channelId !== channelId) return;
      if (data.fromUserId === userId) return;

      const pc = peersRef.current.get(data.fromUserId);
      if (!pc) return;

      let meta = peerIceRef.current.get(data.fromUserId);
      if (!meta) {
        meta = { pending: [], remoteAnswerSet: false };
        peerIceRef.current.set(data.fromUserId, meta);
      }

      try {
        if (data.type === 'answer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          meta.remoteAnswerSet = true;
          const copy = [...meta.pending];
          meta.pending.length = 0;
          for (const c of copy) {
            try {
              await pc.addIceCandidate(c);
            } catch (e) {
              console.warn('[live/publisher] flush ice', e);
            }
          }
        } else if (data.type === 'ice-candidate' && data.candidate) {
          if (!meta.remoteAnswerSet) {
            meta.pending.push(data.candidate);
          } else {
            await pc.addIceCandidate(data.candidate);
          }
        }
      } catch (e) {
        console.warn('[live/publisher] signal handling failed', e);
      }
    },
    [socket, channelId, userId],
  );

  const createOfferForViewer = useCallback(
    async (viewerId: string) => {
      if (!socket || !channelId) return;

      removePeer(viewerId);
      peerIceRef.current.set(viewerId, { pending: [], remoteAnswerSet: false });

      const screen = screenStreamRef.current;
      const cam = camStreamRef.current;
      if (!screen && !cam) {
        return;
      }

      const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      peersRef.current.set(viewerId, pc);

      pc.onicecandidate = (ev) => {
        if (ev.candidate && socket.connected) {
          socket.emit('webrtc:signal', {
            channelId,
            toUserId: viewerId,
            type: 'ice-candidate',
            candidate: ev.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          removePeer(viewerId);
        }
      };

      if (screen) {
        screen.getTracks().forEach((t) => pc.addTrack(t, screen));
      }
      if (cam) {
        cam.getTracks().forEach((t) => pc.addTrack(t, cam));
      }

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', {
          channelId,
          toUserId: viewerId,
          type: 'offer',
          sdp: { type: offer.type, sdp: offer.sdp },
        });
      } catch (e) {
        console.warn('[live/publisher] createOffer failed', e);
        removePeer(viewerId);
      }
    },
    [socket, channelId, removePeer, screenStreamRef, camStreamRef],
  );

  useEffect(() => {
    if (!socket || !channelId) return;

    const onWatchRequest = (payload: { channelId: string; fromUserId: string }) => {
      if (payload.channelId !== channelId) return;
      if (payload.fromUserId === userId) return;
      void createOfferForViewer(payload.fromUserId);
    };

    const onWatchStop = (payload: { channelId: string; fromUserId: string }) => {
      if (payload.channelId !== channelId) return;
      removePeer(payload.fromUserId);
    };

    const onSignal = (data: {
      channelId: string;
      fromUserId: string;
      type: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      void handleRemoteSignal(data);
    };

    socket.on('webrtc:watch-request', onWatchRequest);
    socket.on('webrtc:watch-stop', onWatchStop);
    socket.on('webrtc:signal', onSignal);

    return () => {
      socket.off('webrtc:watch-request', onWatchRequest);
      socket.off('webrtc:watch-stop', onWatchStop);
      socket.off('webrtc:signal', onSignal);
    };
  }, [socket, channelId, userId, createOfferForViewer, removePeer, handleRemoteSignal]);

  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      peerIceRef.current.clear();
    };
  }, [channelId]);
}
