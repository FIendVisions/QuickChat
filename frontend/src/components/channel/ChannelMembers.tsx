// frontend/src/components/channel/ChannelMembers.tsx

'use client';

import { useEffect, useState } from 'react';
import { Crown, Shield, ChevronRight, ChevronLeft, Users } from 'lucide-react';

interface MemberInfo {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  isOnline: boolean;
  role?: string;
}

interface ChannelMembersProps {
  channelId: string;
  userId: string;
  isOwner: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function ChannelMembers({ channelId, userId, isOwner }: ChannelMembersProps) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [channelId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/channels/${channelId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : (data.members || []));
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const onlineCount = members.filter(m => m.isOnline).length;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1 px-2 py-1.5 text-text-muted hover:text-text-normal transition-colors"
        title="展开成员列表"
      >
        <ChevronLeft size={14} />
        <Users size={14} />
        <span className="text-xs">{members.length}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full w-48 border-l border-border-color bg-bg-secondary">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-color">
        <div className="flex items-center gap-1.5">
          <Users size={12} className="text-text-muted" />
          <span className="text-xs font-medium text-text-muted">
            成员 {members.length}
          </span>
          <span className="text-[10px] text-success">● {onlineCount}</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-text-muted hover:text-text-normal transition-colors"
          title="收起"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {loading ? (
        <div className="p-3 text-xs text-text-muted animate-pulse">加载中...</div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-2 px-3 py-1 hover:bg-bg-hover/50 transition-colors"
            >
              {/* avatar + online dot */}
              <div className="relative flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] text-text-muted font-medium">
                  {(member.username || '?').charAt(0).toUpperCase()}
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-bg-secondary ${
                    member.isOnline ? 'bg-success' : 'bg-text-muted/40'
                  }`}
                />
              </div>

              {/* name + id */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-normal truncate">{member.username}</span>
                  {member.role === 'OWNER' && <Crown size={10} className="text-warning flex-shrink-0" />}
                  {member.role === 'ADMIN' && <Shield size={10} className="text-primary flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-text-muted/60 truncate font-mono leading-tight">
                  {member.userId.length > 12 ? member.userId.slice(0, 12) + '…' : member.userId}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
