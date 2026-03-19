// frontend/src/components/voice/VoiceControlsEnhanced.tsx

'use client';

import { Mic, MicOff, Headphones, MonitorUp, MessageSquare, PhoneOff, Sliders } from 'lucide-react';
import { useCallback, useState } from 'react';

interface VoiceControlsProps {
  isConnected: boolean;
  isMicrophoneOpen: boolean;
  isDeafened: boolean;
  audioLevel?: number; // 0-100
  isCalibrating?: boolean;
  onToggleMicrophone: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare?: () => void;
  onToggleChat?: () => void;
  onLeave?: () => void;
  onCalibrate?: () => Promise<void>;
  showChat?: boolean;
  showCalibrate?: boolean;
}

/**
 * 语音控制栏（增强版）
 * 提供麦克风、耳机、屏幕共享等控制按钮，以及音量可视化
 */
export function VoiceControlsEnhanced({
  isConnected,
  isMicrophoneOpen,
  isDeafened,
  audioLevel = 0,
  isCalibrating = false,
  onToggleMicrophone,
  onToggleDeafen,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  onCalibrate,
  showChat = false,
  showCalibrate = true,
}: VoiceControlsProps) {
  const [calibrating, setCalibrating] = useState(false);

  const handleCalibrate = useCallback(async () => {
    if (!onCalibrate) {
      return;
    }

    setCalibrating(true);
    try {
      await onCalibrate();
    } finally {
      setCalibrating(false);
    }
  }, [onCalibrate]);

  const controlButtonClass = (isActive: boolean, isDanger = false) => `
    flex flex-col items-center justify-center gap-1 p-2 rounded-lg
    transition-all duration-150
    ${isActive
      ? isDanger
        ? 'bg-danger text-white hover:bg-red-600'
        : 'bg-success text-white hover:bg-green-600'
      : 'bg-bg-secondary text-text-normal hover:bg-bg-tertiary'
    }
    ${!isActive ? 'opacity-50' : ''}
  `;

  return (
    <div className="flex flex-col">
      {/* 音量可视化 */}
      {isMicrophoneOpen && (
        <div className="mb-2 flex items-center justify-center gap-2 px-4">
          <div className="flex items-center gap-1">
            <Mic size={14} className={audioLevel > 0 ? 'text-success' : 'text-text-muted'} />
            <div className="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-success transition-all duration-100 ease-out"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-text-muted">
            {audioLevel.toFixed(0)}%
          </span>
        </div>
      )}

      {/* 按钮栏 */}
      <div className="flex items-center justify-center gap-2 p-4 bg-bg-secondary">
        {/* 麦克风开关 */}
        <button
          onClick={onToggleMicrophone}
          disabled={!isConnected}
          className={controlButtonClass(isMicrophoneOpen)}
          title={isMicrophoneOpen ? '关闭麦克风' : '开启麦克风'}
        >
          {isMicrophoneOpen ? <Mic size={24} /> : <MicOff size={24} />}
          <span className="text-xs">麦克风</span>
        </button>

        {/* 耳机开关（耳聋模式） */}
        <button
          onClick={onToggleDeafen}
          disabled={!isConnected}
          className={controlButtonClass(isDeafened)}
          title={isDeafened ? '取消耳聋' : '耳聋模式'}
        >
          <Headphones size={24} />
          <span className="text-xs">耳机</span>
        </button>

        {/* 校准按钮 */}
        {showCalibrate && (
          <button
            onClick={handleCalibrate}
            disabled={!isConnected || calibrating || !isMicrophoneOpen}
            className={`
              flex flex-col items-center justify-center gap-1 p-2 rounded-lg
              transition-all duration-150
              ${calibrating
                ? 'bg-warning text-white animate-pulse'
                : 'bg-bg-secondary text-text-normal hover:bg-bg-tertiary'
              }
              ${!isConnected || !isMicrophoneOpen ? 'opacity-50' : ''}
            `}
            title="校准麦克风"
          >
            <Sliders size={24} />
            <span className="text-xs">{calibrating ? '校准中...' : '校准'}</span>
          </button>
        )}

        {/* 屏幕共享（暂未实现） */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            disabled={!isConnected}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-bg-secondary text-text-normal hover:bg-bg-tertiary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="屏幕共享"
          >
            <MonitorUp size={24} />
            <span className="text-xs">屏幕</span>
          </button>
        )}

        {/* 聊天开关 */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`
              flex flex-col items-center justify-center gap-1 p-2 rounded-lg
              transition-all duration-150
              ${showChat
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-normal hover:bg-bg-tertiary'
              }
            `}
            title="切换聊天"
          >
            <MessageSquare size={24} />
            <span className="text-xs">聊天</span>
          </button>
        )}

        {/* 退出按钮 */}
        {onLeave && (
          <button
            onClick={onLeave}
            disabled={!isConnected}
            className={controlButtonClass(true, true)}
            title="退出语音频道"
          >
            <PhoneOff size={24} />
            <span className="text-xs">断开</span>
          </button>
        )}

        {/* 未连接提示 */}
        {!isConnected && (
          <div className="ml-4 text-sm text-text-muted">
            连接中...
          </div>
        )}
      </div>
    </div>
  );
}
