// frontend/src/types/channel.types.ts

/**
 * 频道类型
 */
export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

/**
 * 频道接口
 */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
  };
  maxParticipants?: number;
  participantCount?: number;
  hasPassword?: boolean;
  requiresApproval?: boolean; // 是否需要审核
  inviteCode?: string; // 频道邀请码
  createdAt: string;
  updatedAt: string;
}

/**
 * 频道成员接口
 */
export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  joinedAt: string;
  isOnline: boolean;
  avatar?: string;
}

/**
 * 创建频道请求接口
 */
export interface CreateChannelRequest {
  name: string;
  type: ChannelType;
  description?: string;
  password?: string;
  requiresApproval: boolean;
  maxParticipants?: number;
}

/**
 * 加入频道请求接口
 */
export interface JoinChannelRequest {
  channelId: string;
  password?: string;
}
