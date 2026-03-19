// frontend/src/components/voice/VoiceControls.tsx

'use client';

import { Mic, MicOff, Headphones, MonitorUp, MessageSquare, PhoneOff } from 'lucide-react';
import { useCallback } from 'react';

interface VoiceControlsProps {
  isConnected: boolean;
  isMicrophoneOpen: boolean;
  isDeafened: boolean;
  onToggleMicrophone: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare?: () => void;
  onToggleChat?: () => void;
  onLeave?: () => void;
  showChat?: boolean;
}

/**
 * 语音控制栏
 * 提供麦克风、耳机、屏幕共享等控制按钮
 */
export function VoiceControls({
  isConnected,
  isMicrophoneOpen,
  isDeafened,
  onToggleMicrophone,
  onToggleDeafen,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  showChat = false,
}: VoiceControlsProps) {
  const handleLeave = useCallback(() => {
    if (onLeave) {
      if (confirm('确定要退出语音频道吗？')) {
        onLeave();
      }
    }
  }, [onLeave]);

  const controlButtonClass = (isActive: boolean, isDanger = false) => `
    flex flex-col items-center justify-center gap-1 p-3 rounded-lg
    transition-all duration-150
    ${isActive
      ? isDanger
        ? 'bg-danger text-white hover:bg-red-600'
        : 'bg-success text-white hover:bg-green-600'
      : 'bg-bg-secondary text-text-normal hover:bg-bg-tertiary'
    }
  `;

  return (
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

      {/* 屏幕共享（暂未实现） */}
      {onToggleScreenShare && (
        <button
          onClick={onToggleScreenShare}
          disabled={!isConnected}
          className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-bg-secondary text-text-normal hover:bg-bg-tertiary transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
            flex flex-col items-center justify-center gap-1 p-3 rounded-lg
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
          onClick={handleLeave}
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
  );
}
