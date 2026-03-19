// frontend/src/components/voice/EmptySlot.tsx

'use client';

import { UserPlus } from 'lucide-react';

interface EmptySlotProps {
  isCompact?: boolean;
}

/**
 * 空位占位符
 * 显示可用的空位，点击可邀请用户
 */
export function EmptySlot({ isCompact }: EmptySlotProps) {
  const sizeClass = isCompact ? 'h-20' : 'h-32';

  return (
    <div
      className={`
        flex items-center justify-center
        bg-bg-tertiary rounded-lg border-2 border-dashed border-bg-secondary
        hover:border-bg-floating hover:bg-bg-floating/50
        transition-all duration-200 cursor-pointer
        ${sizeClass}
      `}
      onClick={() => {
        // TODO: 打开邀请用户对话框
        console.log('Invite user');
      }}
    >
      <div className="text-center">
        <UserPlus size={24} className="mx-auto mb-2 text-text-muted" />
        <p className="text-sm text-text-muted">空位</p>
      </div>
    </div>
  );
}
