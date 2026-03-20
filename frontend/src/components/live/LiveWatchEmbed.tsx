'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Monitor, Video } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { DEFAULT_ICE_SERVERS } from '@/lib/webrtcConfig';

interface LiveWatchEmbedProps {
  socket: Socket | null;
  channelId: string;
  broadcasterUserId: string;
  broadcasterName: string;
  hasScreen: boolean;
  hasCamera: boolean;
  onClose: () => void;
}

/**
 * 嵌入聊天区：观看同频道用户的屏幕/摄像头 WebRTC。
 * ICE 在 setRemoteDescription(offer) 之前到达时会先入队，避免一直连不上。
 */
export function LiveWatchEmbed({
  socket,
  channelId,
  broadcasterUserId,
  broadcasterName,
  hasScreen,
  hasCamera,
  onClose,
}: LiveWatchEmbedProps) {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<string>('正在连接…');
  const [screenLive, setScreenLive] = useState(false);
  const [camLive, setCamLive] = useState(false);

  const teardown = useCallback(() => {
    if (socket?.connected && channelId) {
      socket.emit('webrtc:watch-stop', {
        channelId,
        targetUserId: broadcasterUserId,
      });
    }
    pcRef.current?.close();
    pcRef.current = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    if (camVideoRef.current) camVideoRef.current.srcObject = null;
  }, [socket, channelId, broadcasterUserId]);

  const handleClose = useCallback(() => {
    teardown();
    onClose();
  }, [teardown, onClose]);

  useEffect(() => {
    if (!socket || !channelId) {
      setStatus('未连接');
      return;
    }

    let videoCount = 0;
    const pendingIce: RTCIceCandidateInit[] = [];
    let remoteOfferSet = false;

    const flushIce = async (pc: RTCPeerConnection) => {
      while (pendingIce.length > 0) {
        const c = pendingIce.shift();
        if (!c) continue;
        try {
          await pc.addIceCandidate(c);
        } catch (e) {
          console.warn('[live/viewer] addIceCandidate', e);
        }
      }
    };

    const pc = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 0,
    });
    pcRef.current = pc;

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket.connected) {
        socket.emit('webrtc:signal', {
          channelId,
          toUserId: broadcasterUserId,
          type: 'ice-candidate',
          candidate: ev.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (ev) => {
      if (ev.track.kind !== 'video') return;
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      if (videoCount === 0 && screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        void screenVideoRef.current.play().catch(() => {});
        setScreenLive(true);
      } else if (videoCount === 1 && camVideoRef.current) {
        camVideoRef.current.srcObject = stream;
        void camVideoRef.current.play().catch(() => {});
        setCamLive(true);
      }
      videoCount += 1;
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') setStatus('直播中');
      else if (s === 'connecting' || s === 'new') setStatus('正在连接…');
      else if (s === 'failed' || s === 'disconnected') setStatus('连接中断，请关闭后重试');
      else if (s === 'closed') setStatus('已结束');
    };

    const onSignal = async (data: {
      channelId: string;
      fromUserId: string;
      type: string;
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (data.channelId !== channelId || data.fromUserId !== broadcasterUserId) return;

      try {
        if (data.type === 'offer' && data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          remoteOfferSet = true;
          await flushIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            channelId,
            toUserId: broadcasterUserId,
            type: 'answer',
            sdp: { type: answer.type, sdp: answer.sdp },
          });
        } else if (data.type === 'ice-candidate' && data.candidate) {
          if (!remoteOfferSet) {
            pendingIce.push(data.candidate);
          } else {
            await pc.addIceCandidate(data.candidate);
          }
        }
      } catch (e) {
        console.warn('[live/viewer] signal error', e);
        setStatus('连接失败');
      }
    };

    socket.on('webrtc:signal', onSignal);
    socket.emit('webrtc:watch-request', {
      channelId,
      targetUserId: broadcasterUserId,
    });

    return () => {
      socket.off('webrtc:signal', onSignal);
      if (socket.connected) {
        socket.emit('webrtc:watch-stop', {
          channelId,
          targetUserId: broadcasterUserId,
        });
      }
      pc.close();
      pcRef.current = null;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      if (camVideoRef.current) camVideoRef.current.srcObject = null;
    };
  }, [socket, channelId, broadcasterUserId]);

  const showCamPip = hasScreen && hasCamera;

  return (
    <div className="flex min-h-[180px] max-h-[min(42vh,420px)] shrink-0 flex-col border-b border-border-color bg-bg-tertiary/40">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-color/80 bg-bg-secondary/90 px-3 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-text-normal">
            直播：{broadcasterName}
          </p>
          <p className="text-[10px] text-text-muted">{status}</p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-normal"
          title="关闭直播画面"
        >
          <X size={18} />
        </button>
      </div>

      <div className="relative min-h-[140px] flex-1 bg-black">
        <video
          ref={screenVideoRef}
          className="h-full max-h-[min(38vh,380px)] w-full object-contain"
          playsInline
          muted
          autoPlay
        />
        {!screenLive && (hasScreen || hasCamera) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-text-muted">
            等待画面…
          </div>
        )}

        {showCamPip && (
          <div className="absolute bottom-2 right-2 w-[min(32%,200px)] overflow-hidden rounded-md border border-primary/50 bg-black shadow-md">
            <div className="flex items-center gap-0.5 bg-bg-secondary/95 px-1.5 py-0.5 text-[9px] text-text-muted">
              <Video size={9} />
              摄像头
            </div>
            <video
              ref={camVideoRef}
              className="aspect-video w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {!camLive && (
              <div className="absolute inset-0 top-4 flex items-center justify-center bg-black/75 text-[9px] text-text-muted">
                等待…
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 px-2 py-1 text-[10px] text-text-muted">
        {hasScreen && (
          <span className="flex items-center gap-0.5 rounded bg-bg-tertiary px-1.5 py-0.5">
            <Monitor size={10} />
            屏幕
          </span>
        )}
        {hasCamera && (
          <span className="flex items-center gap-0.5 rounded bg-bg-tertiary px-1.5 py-0.5">
            <Video size={10} />
            摄像头
          </span>
        )}
      </div>
    </div>
  );
}
