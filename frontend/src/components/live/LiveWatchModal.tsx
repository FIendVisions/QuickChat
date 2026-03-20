'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Monitor, Video } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { DEFAULT_ICE_SERVERS } from '@/lib/webrtcConfig';

interface LiveWatchModalProps {
  socket: Socket | null;
  channelId: string;
  broadcasterUserId: string;
  broadcasterName: string;
  hasScreen: boolean;
  hasCamera: boolean;
  onClose: () => void;
}

/**
 * 观众端：请求观看指定用户的屏幕 + 摄像头 WebRTC 流。
 * 与主播端 addTrack 顺序一致：先屏幕后摄像头 → 第一路视频进主画面，第二路进画中画。
 */
export function LiveWatchModal({
  socket,
  channelId,
  broadcasterUserId,
  broadcasterName,
  hasScreen,
  hasCamera,
  onClose,
}: LiveWatchModalProps) {
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<string>('正在连接…');
  const [screenLive, setScreenLive] = useState(false);
  const [camLive, setCamLive] = useState(false);

  const stopAll = useCallback(() => {
    const sock = socket;
    if (sock?.connected && channelId) {
      sock.emit('webrtc:watch-stop', {
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
    stopAll();
    onClose();
  }, [stopAll, onClose]);

  useEffect(() => {
    if (!socket || !channelId) {
      setStatus('未连接');
      return;
    }

    let videoCount = 0;
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
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
      else if (s === 'failed' || s === 'disconnected') setStatus('连接中断');
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
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            channelId,
            toUserId: broadcasterUserId,
            type: 'answer',
            sdp: { type: answer.type, sdp: answer.sdp },
          });
        } else if (data.type === 'ice-candidate' && data.candidate) {
          await pc.addIceCandidate(data.candidate);
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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="live-watch-title"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border-color bg-bg-secondary shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border-color px-4 py-2">
          <div className="min-w-0">
            <h2 id="live-watch-title" className="truncate text-sm font-semibold text-text-normal">
              正在观看：{broadcasterName}
            </h2>
            <p className="text-[11px] text-text-muted">{status}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-text-muted hover:bg-bg-hover hover:text-text-normal"
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative min-h-[240px] flex-1 bg-black">
          <video
            ref={screenVideoRef}
            className="h-full w-full object-contain"
            playsInline
            muted
            autoPlay
          />
          {!screenLive && (hasScreen || hasCamera) && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted">
              等待画面…
            </div>
          )}

          {showCamPip && (
            <div className="absolute bottom-3 right-3 w-[min(28%,220px)] overflow-hidden rounded-lg border-2 border-primary/60 bg-black shadow-lg">
              <div className="flex items-center gap-1 bg-bg-secondary/90 px-2 py-0.5 text-[10px] text-text-muted">
                <Video size={10} />
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
                <div className="absolute inset-0 top-5 flex items-center justify-center bg-black/80 text-[10px] text-text-muted">
                  等待摄像头…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border-color px-3 py-2 text-[11px] text-text-muted">
          {hasScreen && (
            <span className="flex items-center gap-1 rounded bg-bg-tertiary px-2 py-0.5">
              <Monitor size={12} />
              屏幕共享
            </span>
          )}
          {hasCamera && (
            <span className="flex items-center gap-1 rounded bg-bg-tertiary px-2 py-0.5">
              <Video size={12} />
              摄像头
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
