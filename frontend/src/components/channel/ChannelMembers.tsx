// frontend/src/components/channel/ChannelMembers.tsx

'use client';

import { useEffect, useState } from 'react';
import { Crown, Shield, User as UserIcon, ShieldOff, Trash2 } from 'lucide-react';
import { ChannelMember } from '@/types/channel.types';

interface ChannelMembersProps {
  channelId: string;
  userId: string;
  token?: string;
  isOwner: boolean;
}

/**
 * 频道成员列表组件
 * 显示频道成员，提供管理功能
 */
export function ChannelMembers({ channelId, userId, token, isOwner }: ChannelMembersProps) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [channelId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/channels/${channelId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const setMemberRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/channels/${channelId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        loadMembers(); // 重新加载成员列表
      } else {
        alert('设置权限失败');
      }
    } catch (error) {
      console.error('Failed to set role:', error);
      alert('设置权限失败');
    }
  };

  const removeMember = async (userId: string, username: string) => {
    if (!confirm(`确定要移除 ${username} 吗？`)) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/channels/${channelId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadMembers();
        alert('成员已移除');
      } else {
        alert('移除成员失败');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('移除成员失败');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center text-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="p-4 border-b border-border-color">
        <h3 className="text-sm font-bold text-text-normal">频道成员</h3>
        <p className="text-xs text-text-muted mt-1">共 {members.length} 人</p>
      </div>

      {/* 成员列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-bg-secondary transition-colors"
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
                <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-sm">
                  {member.username.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* 在线状态 */}
              <div className={`absolute -bottom-0.5 -right-0.5 flex h-3 w-3`}>
                <div className={`h-3 w-3 rounded-full border-2 border-bg-primary ${
                  member.isOnline ? 'bg-success' : 'bg-text-muted'
                }`} />
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-text-normal truncate">
                  {member.username}
                </p>
                {member.role === 'OWNER' && (
                  <Crown size={12} className="text-warning flex-shrink-0" />
                )}
                {member.role === 'ADMIN' && (
                  <Shield size={12} className="text-primary flex-shrink-0" />
                )}
              </div>
              
              {/* 状态标签 */}
              {member.status === 'PENDING' && (
                <p className="text-xs text-warning">待审核</p>
              )}
            </div>

            {/* 操作按钮 (仅创建者可见) */}
            {isOwner && member.userId !== userId && (
              <div className="flex items-center gap-1">
                {member.role === 'ADMIN' ? (
                  <button
                    onClick={() => setMemberRole(member.userId, 'MEMBER')}
                    className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-normal transition-colors"
                    title="移除管理员"
                  >
                    <ShieldOff size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => setMemberRole(member.userId, 'ADMIN')}
                    className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-primary transition-colors"
                    title="设为管理员"
                  >
                    <Shield size={14} />
                  </button>
                )}
                <button
                  onClick={() => removeMember(member.userId, member.username)}
                  className="p-1.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-danger transition-colors"
                  title="移除成员"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
