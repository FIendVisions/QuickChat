// frontend/src/types/channel.types.ts

/**
 * 频道可见性（公开 / 私密）
 */
export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

/** 频道形态：文字 / 语音（含原直播能力）/ 论坛 */
export enum ChannelKind {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  FORUM = 'FORUM',
}

export interface ChannelCategoryRef {
  id: string;
  name: string;
  position: number;
}

/**
 * 频道接口
 */
export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  kind?: ChannelKind;
  serverId?: string | null;
  categoryId?: string | null;
  category?: ChannelCategoryRef | null;
  description?: string;
  ownerId: string;
  owner?: {
    id: string;
    username: string;
  };
  maxParticipants?: number;
  participantCount?: number;
  hasPassword?: boolean;
  requiresApproval?: boolean;
  inviteCode?: string;
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
  kind?: ChannelKind;
  serverId?: string;
  categoryId?: string;
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
