'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  MonitorUp,
  MonitorOff,
  Headphones,
  Video,
  VideoOff,
} from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useLivePublisher } from '@/hooks/useLivePublisher';

const OUTPUT_VOLUME_KEY = 'quickchat_output_volume_v1';

interface UserSelfPanelProps {
  username: string;
  email?: string;
  /** 当前选中的频道（未选时为 null，不向该频道广播媒体状态） */
  channelId: string | null;
  userId: string;
}

/**
 * 左下角：用户信息 + 本地媒体；并向当前频道广播屏幕/摄像头状态，供 WebRTC 直播给成员观看。
 */
export function UserSelfPanel({ username, email, channelId, userId }: UserSelfPanelProps) {
  const { socket } = useWebSocket();
  const [micOn, setMicOn] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [outputVol, setOutputVol] = useState(80);
  const [hint, setHint] = useState<string | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useLivePublisher({
    socket,
    channelId,
    userId,
    screenStreamRef,
    camStreamRef,
  });

  useEffect(() => {
    try {
      const v = localStorage.getItem(OUTPUT_VOLUME_KEY);
      if (v != null) {
        const n = Number(v);
        if (!Number.isNaN(n)) setOutputVol(Math.min(100, Math.max(0, n)));
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OUTPUT_VOLUME_KEY, String(outputVol));
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(
        new CustomEvent('quickchat:outputVolume', { detail: { volume: outputVol / 100 } }),
      );
    } catch {
      /* ignore */
    }
  }, [outputVol]);

  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => setHint(null), 5000);
    return () => window.clearTimeout(t);
  }, [hint]);

  const broadcastMediaState = useCallback(
    (screen: boolean, camera: boolean) => {
      if (!socket?.connected || !channelId) return;
      socket.emit('channel:media:state', {
        channelId,
        userId,
        username,
        screen,
        camera,
      });
    },
    [socket, channelId, userId, username],
  );

  /* 同步屏幕/摄像头状态到成员列表（延迟一点确保已 join:channel） */
  useEffect(() => {
    if (!socket?.connected || !channelId) return;
    const t = window.setTimeout(() => {
      broadcastMediaState(screenOn, camOn);
    }, 200);
    return () => window.clearTimeout(t);
  }, [socket, channelId, screenOn, camOn, broadcastMediaState]);

  const usernameRef = useRef(username);
  usernameRef.current = username;

  /* 离开频道或切换频道时关闭直播状态广播（避免因 username 变化误发） */
  useEffect(() => {
    const cid = channelId;
    const uid = userId;
    return () => {
      if (socket?.connected && cid) {
        socket.emit('channel:media:state', {
          channelId: cid,
          userId: uid,
          username: usernameRef.current,
          screen: false,
          camera: false,
        });
      }
    };
  }, [socket, channelId, userId]);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicOn(false);
  }, []);

  const startMic = useCallback(async () => {
    setHint(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHint('当前环境不支持麦克风');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      micStreamRef.current = stream;
      setMicOn(true);
    } catch {
      setHint('无法访问麦克风（请检查权限）');
      setMicOn(false);
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (micOn) stopMic();
    else void startMic();
  }, [micOn, startMic, stopMic]);

  const stopCam = useCallback(() => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    setCamOn(false);
  }, []);

  const startCam = useCallback(async () => {
    setHint(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHint('当前环境不支持摄像头');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true,
      });
      camStreamRef.current = stream;
      setCamOn(true);
    } catch {
      setHint('无法访问摄像头');
    }
  }, []);

  const toggleCam = useCallback(() => {
    if (camOn) stopCam();
    else void startCam();
  }, [camOn, startCam, stopCam]);

  const stopScreen = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
  }, []);

  const startScreen = useCallback(async () => {
    setHint(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setHint('当前环境不支持屏幕共享');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      setScreenOn(true);
      const vt = stream.getVideoTracks()[0];
      vt?.addEventListener('ended', () => {
        stopScreen();
      });
    } catch {
      setHint('已取消或未授权屏幕共享');
    }
  }, [stopScreen]);

  const toggleScreen = useCallback(() => {
    if (screenOn) stopScreen();
    else void startScreen();
  }, [screenOn, startScreen, stopScreen]);

  useEffect(() => {
    return () => {
      stopMic();
      stopCam();
      stopScreen();
    };
  }, [stopMic, stopCam, stopScreen]);

  const iconBtn = (active: boolean, warn?: boolean) =>
    `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
      active
        ? warn
          ? 'border-warning bg-warning/15 text-warning'
          : 'border-success bg-success/15 text-success'
        : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover hover:text-text-normal'
    }`;

  return (
    <div className="shrink-0 border-t border-border-color bg-bg-secondary p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary"
          aria-hidden
        >
          {(username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-normal">{username}</p>
          {email ? (
            <p className="truncate text-[10px] text-text-muted">{email}</p>
          ) : (
            <p className="truncate text-[10px] text-text-muted">本地媒体 / 直播</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={iconBtn(micOn)}
          onClick={toggleMic}
          title={micOn ? '关闭麦克风' : '开启麦克风'}
        >
          {micOn ? <Mic size={18} /> : <MicOff size={18} />}
        </button>
        <button
          type="button"
          className={iconBtn(deafened, true)}
          onClick={() => setDeafened((d) => !d)}
          title={deafened ? '取消静音收听' : '静音收听（本地）'}
        >
          <Headphones size={18} />
        </button>
        <button
          type="button"
          className={iconBtn(screenOn)}
          onClick={toggleScreen}
          title={screenOn ? '停止屏幕共享' : '屏幕共享'}
        >
          {screenOn ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
        </button>
        <button
          type="button"
          className={iconBtn(camOn)}
          onClick={toggleCam}
          title={camOn ? '关闭摄像头' : '开启摄像头'}
        >
          {camOn ? <Video size={18} /> : <VideoOff size={18} />}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Volume2
          size={14}
          className={`shrink-0 text-text-muted ${deafened ? 'opacity-35' : ''}`}
          aria-hidden
        />
        <input
          type="range"
          min={0}
          max={100}
          value={outputVol}
          disabled={deafened}
          onChange={(e) => setOutputVol(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-40"
          title="收听音量（本地设置，可对接语音输出）"
          aria-label="收听音量"
        />
        <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-text-muted">
          {deafened ? '—' : outputVol}
        </span>
      </div>

      {hint && (
        <p className="mt-1.5 rounded bg-bg-tertiary px-1.5 py-1 text-[10px] leading-snug text-warning">
          {hint}
        </p>
      )}
    </div>
  );
}
