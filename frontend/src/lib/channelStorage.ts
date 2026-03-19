// frontend/src/lib/channelStorage.ts

import { Channel, ChannelType } from '@/types/channel.types';

const STORAGE_KEY = 'quickchat_channels';
const CHANNEL_MEMBERS_KEY = 'quickchat_channel_members';

/**
 * 生成随机邀请码（8位大写字母+数字）
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆的字符
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成唯一的频道ID
 */
function generateChannelId(): string {
  return `ch_${generateInviteCode()}`;
}

/**
 * 扩展的频道接口，包含邀请码
 */
interface ExtendedChannel extends Channel {
  inviteCode?: string;
}

/**
 * 获取所有频道
 */
export function getAllChannels(): ExtendedChannel[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return getDefaultChannels();
    }
    const channels: ExtendedChannel[] = JSON.parse(data);
    return channels;
  } catch {
    return getDefaultChannels();
  }
}

/**
 * 获取默认频道（官方公共频道）
 */
function getDefaultChannels(): ExtendedChannel[] {
  return [
    {
      id: 'public-official',
      name: '公共频道',
      type: 'PUBLIC' as any,
      description: '官方频道 - 所有用户自动加入',
      ownerId: 'system',
      participantCount: 0,
      hasPassword: false,
      requiresApproval: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * 保存频道列表
 */
function saveChannels(channels: ExtendedChannel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  } catch (error) {
    console.error('Failed to save channels:', error);
  }
}

/**
 * 创建新频道
 */
export function createChannel(data: {
  name: string;
  type: ChannelType;
  description?: string;
  password?: string;
  requiresApproval?: boolean;
  ownerId: string;
}): ExtendedChannel {
  console.log('=== createChannel called ===');
  console.log('Input data:', JSON.stringify(data, null, 2));

  const channels = getAllChannels();
  console.log('Current channels:', channels.map(ch => ({ id: ch.id, name: ch.name })));

  // 检查频道名是否重复
  if (channels.some(ch => ch.name === data.name)) {
    throw new Error('频道名称已存在');
  }

  const channelId = generateChannelId();
  const inviteCode = generateInviteCode();

  console.log('Generated IDs - Channel:', channelId, 'Invite:', inviteCode);

  const newChannel: ExtendedChannel = {
    id: channelId,
    inviteCode: inviteCode,
    name: data.name,
    type: data.type, // 直接使用，不做转换
    description: data.description,
    ownerId: data.ownerId,
    hasPassword: !!data.password,
    requiresApproval: data.requiresApproval || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('New channel object:', JSON.stringify(newChannel, null, 2));

  // 保存密码（如果有的话）
  if (data.password) {
    localStorage.setItem(`channel_password_${channelId}`, data.password);
  }

  // 保存邀请码映射
  const mappingKey = `channel_invite_${inviteCode}`;
  localStorage.setItem(mappingKey, channelId);
  console.log('Saved invite mapping:', mappingKey, '=', channelId);

  channels.push(newChannel);
  saveChannels(channels);

  // 验证保存
  const verification = getAllChannels();
  console.log('Verification - channels after save:', verification.map(ch => ({ id: ch.id, name: ch.name })));

  return newChannel;
}

/**
 * 删除频道
 */
export function deleteChannel(channelId: string): void {
  // 不能删除官方频道
  if (channelId === 'public-official') {
    throw new Error('不能删除官方频道');
  }

  const channels = getAllChannels();
  const channel = channels.find(ch => ch.id === channelId);

  if (!channel) {
    throw new Error('频道不存在');
  }

  const filtered = channels.filter(ch => ch.id !== channelId);
  saveChannels(filtered);

  // 删除密码
  localStorage.removeItem(`channel_password_${channelId}`);

  // 删除邀请码映射
  if (channel.inviteCode) {
    localStorage.removeItem(`channel_invite_${channel.inviteCode}`);
  }
}

/**
 * 通过邀请码获取频道
 */
export function getChannelByInviteCode(inviteCode: string): ExtendedChannel | null {
  console.log('Looking up invite code:', inviteCode);

  // 先查找映射表
  const channelId = localStorage.getItem(`channel_invite_${inviteCode}`);
  console.log('Found channel ID from mapping:', channelId);

  if (!channelId) {
    // 如果映射表没有，尝试从频道列表中查找
    const channels = getAllChannels();
    const channel = channels.find(ch => ch.inviteCode === inviteCode);
    console.log('Found channel by scanning:', channel);
    return channel || null;
  }

  const channel = getChannel(channelId);
  console.log('Final channel found:', channel);
  return channel;
}

/**
 * 验证频道密码
 */
export function verifyChannelPassword(channelId: string, password: string): boolean {
  const storedPassword = localStorage.getItem(`channel_password_${channelId}`);
  if (!storedPassword) {
    return true; // 没有密码就是公开的
  }
  return storedPassword === password;
}

/**
 * 更新频道
 */
export function updateChannel(channelId: string, updates: Partial<Channel>): ExtendedChannel {
  const channels = getAllChannels();
  const index = channels.findIndex(ch => ch.id === channelId);

  if (index === -1) {
    throw new Error('频道不存在');
  }

  channels[index] = {
    ...channels[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveChannels(channels);
  return channels[index];
}

/**
 * 获取频道
 * 如果频道不在列表中，尝试从映射中重建基本信息
 */
export function getChannel(channelId: string): ExtendedChannel | null {
  const channels = getAllChannels();
  const channel = channels.find(ch => ch.id === channelId);

  if (channel) {
    return channel;
  }

  // 如果找不到，尝试查找邀请码映射来获取基本信息
  console.log('Channel not in list, trying to find from invite mappings...');

  // 遍历所有邀请码映射，找到对应的频道ID
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('channel_invite_')) {
      const mappedId = localStorage.getItem(key);
      if (mappedId === channelId) {
        console.log('Found channel from invite mapping:', key);
        // 返回一个基本的频道对象
        return {
          id: channelId,
          name: '外部频道', // 无法获取名称
          type: 'PUBLIC' as any,
          description: '通过邀请码加入的频道',
          ownerId: 'unknown',
          participantCount: 0,
          hasPassword: false,
          requiresApproval: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

/**
 * 获取频道的邀请码
 */
export function getChannelInviteCode(channelId: string): string | null {
  const channels = getAllChannels();
  const channel = channels.find(ch => ch.id === channelId);

  if (!channel) {
    return null;
  }

  return channel.inviteCode || null;
}

/**
 * 复制频道邀请码到剪贴板
 */
export function copyChannelInviteCode(channelId: string): boolean {
  const inviteCode = getChannelInviteCode(channelId);

  if (!inviteCode) {
    return false;
  }

  try {
    navigator.clipboard.writeText(inviteCode);
    return true;
  } catch {
    return false;
  }
}
