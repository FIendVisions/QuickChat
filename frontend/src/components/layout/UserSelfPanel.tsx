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
  Settings,
  LogOut,
} from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useLivePublisher } from '@/hooks/useLivePublisher';

const OUTPUT_VOLUME_KEY = 'quickchat_output_volume_v1';

interface UserSelfPanelProps {
  username: string;
  email?: string;
  channelId: string | null;
  userId: string;
  onLogout?: () => void;
}

/**
 * Discord 风格底栏：头像 + 昵称 + 麦克风 / 耳机 / 设置；直播与音量收在设置浮层。
 */
export function UserSelfPanel({ username, email, channelId, userId, onLogout }: UserSelfPanelProps) {
  const { socket } = useWebSocket();
  const [micOn, setMicOn] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [outputVol, setOutputVol] = useState(80);
  const [hint, setHint] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useLivePublisher({
    socket,
    channelId,
    userId,
    screenStreamRef,
    camStreamRef,
    screenOn,
    camOn,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

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

  useEffect(() => {
    if (!socket?.connected || !channelId) return;
    const t = window.setTimeout(() => {
      broadcastMediaState(screenOn, camOn);
    }, 200);
    return () => window.clearTimeout(t);
  }, [socket, channelId, screenOn, camOn, broadcastMediaState]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      if (!channelId) return;
      if (screenOn || camOn) {
        window.setTimeout(() => broadcastMediaState(screenOn, camOn), 180);
      }
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
  }, [socket, channelId, screenOn, camOn, broadcastMediaState]);

  const usernameRef = useRef(username);
  usernameRef.current = username;

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

  const iconBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active';

  const shortId = userId.length > 6 ? userId.slice(0, 4) : userId;

  return (
    <div ref={menuRef} className="relative shrink-0 bg-dc-userbar px-2 py-1">
      <div className="flex h-[52px] items-center gap-1 rounded-[4px] bg-[#111214] px-1">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-xs font-semibold text-white"
          aria-hidden
        >
          {(username || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-[13px] font-semibold leading-tight text-dc-channel-text-active">{username}</p>
          <p className="truncate text-[11px] leading-tight text-dc-channel-text">
            {email || `在线 · ${shortId}`}
          </p>
        </div>
        <button
          type="button"
          className={iconBtn}
          title={micOn ? '关闭麦克风' : '开启麦克风'}
          onClick={toggleMic}
        >
          {micOn ? <Mic size={18} className="text-[#23a559]" /> : <MicOff size={18} />}
        </button>
        <button
          type="button"
          className={iconBtn}
          title={deafened ? '取消静音收听' : '静音收听'}
          onClick={() => setDeafened((d) => !d)}
        >
          <Headphones size={18} className={deafened ? 'text-[#f23f43]' : ''} />
        </button>
        <button
          type="button"
          className={`${iconBtn} ${menuOpen ? 'bg-dc-channel-hover text-dc-channel-text-active' : ''}`}
          title="用户设置"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <Settings size={18} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute bottom-[calc(100%+8px)] right-2 z-50 w-[260px] rounded-md border border-black/40 bg-[#111214] py-1 shadow-xl">
          <div className="border-b border-white/5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-dc-channel-text">
            直播与屏幕
          </div>
          <div className="flex flex-wrap gap-1 p-2">
            <button
              type="button"
              onClick={toggleScreen}
              className={`flex flex-1 min-w-[44%] items-center justify-center gap-1 rounded px-2 py-1.5 text-xs ${
                screenOn ? 'bg-[#23a559]/20 text-[#23a559]' : 'bg-dc-channel-hover text-dc-channel-text-active'
              }`}
            >
              {screenOn ? <MonitorOff size={14} /> : <MonitorUp size={14} />}
              屏幕
            </button>
            <button
              type="button"
              onClick={toggleCam}
              className={`flex flex-1 min-w-[44%] items-center justify-center gap-1 rounded px-2 py-1.5 text-xs ${
                camOn ? 'bg-primary/20 text-primary' : 'bg-dc-channel-hover text-dc-channel-text-active'
              }`}
            >
              {camOn ? <VideoOff size={14} /> : <Video size={14} />}
              摄像头
            </button>
          </div>
          <div className="flex items-center gap-2 border-t border-white/5 px-2 py-2">
            <Volume2 size={14} className="shrink-0 text-dc-channel-text" />
            <input
              type="range"
              min={0}
              max={100}
              value={outputVol}
              disabled={deafened}
              onChange={(e) => setOutputVol(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-[#5865f2] disabled:opacity-40"
            />
            <span className="w-6 text-right text-[10px] tabular-nums text-dc-channel-text">
              {deafened ? '—' : outputVol}
            </span>
          </div>
          {hint && <p className="px-2 pb-2 text-[11px] text-[#f0b232]">{hint}</p>}
          {onLogout && (
            <>
              <div className="my-1 h-px bg-white/5" />
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-2 text-sm text-[#f23f43] hover:bg-[#f23f43]/10"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut size={16} />
                退出登录
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
