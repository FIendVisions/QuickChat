// backend/src/modules/channels/interfaces/channel-response.interface.ts

import { Channel, User } from '@prisma/client';
import { ChannelType, ChannelKind } from '../../../common/types';

/**
 * 频道详细信息（包含参与人数）
 */
export interface ChannelDetail extends Channel {
  participantCount: number;
  owner?: {
    id: string;
    username: string;
    avatar?: string;
  };
}

/**
 * 频道列表项（简化信息）
 */
export interface ChannelListItem {
  id: string;
  name: string;
  type: ChannelType;
  kind: ChannelKind;
  serverId?: string | null;
  description?: string;
  ownerId: string;
  owner: {
    id: string;
    username: string;
  };
  maxParticipants?: number;
  participantCount: number;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 频道成员信息
 */
export interface ChannelMemberInfo {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: Date;
  isOnline: boolean;
}

/**
 * 加入频道的响应
 */
export interface JoinChannelResponse {
  success: boolean;
  channelId: string;
  channelName: string;
  isPrivate: boolean;
  canSpeak: boolean;
  participantCount: number;
  message?: string;
}
