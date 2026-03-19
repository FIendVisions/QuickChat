// frontend/src/components/voice/ParticipantCard.tsx

'use client';

import { Mic, MicOff, Volume2, Crown } from 'lucide-react';
import { Participant } from '@/types/voice.types';
import { SpeakingIndicator } from './SpeakingIndicator';
import { VolumeMeter } from './VolumeMeter';

interface ParticipantCardProps {
  participant: Participant;
  isSpeaking: boolean;
  isCompact?: boolean;
}

/**
 * 参与者卡片
 * 显示用户头像、名称和语音状态
 */
export function ParticipantCard({ participant, isSpeaking, isCompact }: ParticipantCardProps) {
  const sizeClass = isCompact ? 'w-16 h-16' : 'w-20 h-20';
  const textSizeClass = isCompact ? 'text-sm' : 'text-base';

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        bg-bg-secondary rounded-lg p-4
        transition-all duration-200
        ${isSpeaking ? 'ring-2 ring-success ring-offset-2 ring-offset-bg-primary' : ''}
        hover:bg-bg-floating
      `}
    >
      {/* 头像 */}
      <div className={`relative ${sizeClass} mb-2`}>
        {/* 头像图片 */}
        <div
          className={`
            flex h-full w-full items-center justify-center rounded-full
            bg-bg-tertiary text-2xl
            ${participant.isMuted ? 'grayscale opacity-50' : ''}
          `}
        >
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={participant.username}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>👤</span>
          )}
        </div>

        {/* 说话指示器 */}
        {isSpeaking && !participant.isMuted && (
          <div className="absolute -bottom-1 -right-1">
            <SpeakingIndicator size="small" />
          </div>
        )}

        {/* 静音图标 */}
        {participant.isMuted && (
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-danger">
            <MicOff size={12} className="text-white" />
          </div>
        )}

        {/* 房主标识（可选） */}
        {/* {participant.isOwner && (
          <div className="absolute -top-1 -right-1">
            <Crown size={16} className="text-warning" />
          </div>
        )} */}
      </div>

      {/* 用户名 */}
      <p className={`truncate text-center font-medium text-text-normal ${textSizeClass} max-w-full`}>
        {participant.username}
      </p>

      {/* 状态指示 */}
      <div className="mt-1 flex items-center gap-1 text-xs text-text-muted">
        {participant.isMuted ? (
          <>
            <MicOff size={12} />
            <span>已静音</span>
          </>
        ) : isSpeaking ? (
          <>
            <Volume2 size={12} className="text-success" />
            <span className="text-success">说话中</span>
          </>
        ) : (
          <>
            <Mic size={12} />
            <span>麦克风开</span>
          </>
        )}
      </div>

      {/* 音量条（仅说话时显示） */}
      {isSpeaking && !participant.isMuted && participant.volume !== undefined && (
        <div className="mt-2">
          <VolumeMeter volume={participant.volume} size="small" />
        </div>
      )}
    </div>
  );
}
