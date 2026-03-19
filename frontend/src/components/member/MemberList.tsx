// frontend/src/components/member/MemberList.tsx

'use client';

import { useEffect, useState } from 'react';
import { channelApi } from '@/services/api/channel.api';
import { MemberItem } from './MemberItem';

interface Member {
  userId: string;
  username: string;
  avatar?: string;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
}

interface MemberListProps {
  channelId: string;
}

/**
 * 成员列表组件
 */
export function MemberList({ channelId }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 加载成员列表
   */
  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const data = await channelApi.getMembers(channelId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();

    // 定期刷新成员列表
    const interval = setInterval(loadMembers, 5000);
    return () => clearInterval(interval);
  }, [channelId]);

  // 分组
  const onlineMembers = members.filter((m) => m.status !== 'OFFLINE');
  const offlineMembers = members.filter((m) => m.status === 'OFFLINE');

  return (
    <div className="h-full overflow-y-auto">
      {/* 在线成员 */}
      <div className="p-4">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-text-muted">
          在线 — {onlineMembers.length}
        </h3>
        <div className="space-y-0.5">
          {onlineMembers.map((member) => (
            <MemberItem key={member.userId} member={member} />
          ))}
        </div>
      </div>

      {/* 离线成员 */}
      {offlineMembers.length > 0 && (
        <div className="p-4 border-t border-bg-secondary">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-text-muted">
            离线 — {offlineMembers.length}
          </h3>
          <div className="space-y-0.5">
            {offlineMembers.map((member) => (
              <MemberItem key={member.userId} member={member} />
            ))}
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="p-4 text-center text-sm text-text-muted">
          加载中...
        </div>
      )}
    </div>
  );
}
