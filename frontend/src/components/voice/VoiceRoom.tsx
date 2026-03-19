// frontend/src/components/voice/VoiceRoom.tsx

'use client';

import { Participant } from '@/types/voice.types';
import { ParticipantCard } from './ParticipantCard';
import { EmptySlot } from './EmptySlot';

interface VoiceRoomProps {
  channelId: string;
  participants: Participant[];
  speakingUsers: Set<string>;
  isCompact?: boolean;
}

/**
 * 语音房间组件
 * 展示所有参与者，高亮正在说话的用户
 */
export function VoiceRoom({
  channelId,
  participants,
  speakingUsers,
  isCompact = false,
}: VoiceRoomProps) {
  const maxParticipants = 10; // 最大人数
  const emptySlots = Math.max(0, maxParticipants - participants.length);

  // 根据人数决定布局
  const getLayoutClass = () => {
    if (participants.length <= 2) return 'grid-cols-2';
    if (participants.length <= 4) return 'grid-cols-2';
    if (participants.length <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  const gridClass = isCompact ? 'grid-cols-2 gap-2' : `grid ${getLayoutClass()} gap-4`;

  return (
    <div className="flex h-full flex-col">
      {/* 房间标题 */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-normal">语音房间</h2>
          <p className="text-sm text-text-muted">
            {participants.length} / {maxParticipants} 人
          </p>
        </div>
      </div>

      {/* 参与者网格 */}
      <div className={`flex-1 ${gridClass} auto-rows-min`}>
        {/* 已加入的参与者 */}
        {participants.map((participant) => (
          <ParticipantCard
            key={participant.userId}
            participant={participant}
            isSpeaking={speakingUsers.has(participant.userId)}
            isCompact={isCompact}
          />
        ))}

        {/* 空位 */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptySlot key={index} isCompact={isCompact} />
        ))}
      </div>
    </div>
  );
}
