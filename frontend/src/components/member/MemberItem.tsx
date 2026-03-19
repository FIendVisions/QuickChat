// frontend/src/components/member/MemberItem.tsx

'use client';

import { Mic, MicOff, Crown } from 'lucide-react';
import { useState } from 'react';

interface Member {
  userId: string;
  username: string;
  avatar?: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
}

interface MemberItemProps {
  member: Member;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

/**
 * 成员项组件
 */
export function MemberItem({ member, isSpeaking = false, isMuted = false }: MemberItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  /**
   * 获取状态颜色
   */
  const getStatusColor = () => {
    switch (member.status) {
      case 'ONLINE':
        return 'bg-success';
      case 'IDLE':
        return 'bg-warning';
      case 'OFFLINE':
        return 'bg-text-muted';
      default:
        return 'bg-text-muted';
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative flex items-center gap-3 rounded px-2 py-1.5
        cursor-pointer transition-all duration-150
        ${isHovered ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/50'}
        ${isSpeaking ? 'bg-success/10' : ''}
      `}
    >
      {/* 头像 */}
      <div className="relative flex-shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt={member.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center">
            👤
          </div>
        )}

        {/* 在线状态指示器 */}
        <div className="absolute bottom-0 right-0 flex h-3 w-3">
          <div className={`h-3 w-3 rounded-full border-2 border-bg-primary ${getStatusColor()}`} />
        </div>

        {/* 说话状态光环 */}
        {isSpeaking && (
          <div className="absolute -inset-1 rounded-full bg-success opacity-30 animate-ping" />
        )}
      </div>

      {/* 用户名 */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-text-normal">
          {member.username}
        </p>
      </div>

      {/* 状态图标（悬停时显示） */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* 房主标识（如果有） */}
        {/* <Crown size={12} className="text-warning" /> */}

        {/* 麦克风状态 */}
        {isMuted ? (
          <MicOff size={14} className="text-danger" />
        ) : (
          <Mic size={14} className="text-success" />
        )}
      </div>
    </div>
  );
}
