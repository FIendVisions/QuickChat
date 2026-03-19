// frontend/src/lib/dbHelpers.ts

/**
 * 数据库辅助函数
 * 简化常用的数据库操作
 */

import {
  getDB,
  STORES,
  type User,
  type Channel,
  type Message,
  type ChannelMember
} from './db';

// ============ 用户操作 ============

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<User> {
  const db = await getDB();

  // 检查用户名是否已存在
  const existingUser = await db.getUserByUsername(username);
  if (existingUser) {
    throw new Error('用户名已被使用');
  }

  // 检查邮箱是否已存在
  const existingEmail = await db.getUserByEmail(email);
  if (existingEmail) {
    throw new Error('邮箱已被注册');
  }

  // 验证密码长度
  if (password.length < 6) {
    throw new Error('密码至少需要6个字符');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('邮箱格式不正确');
  }

  const user: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  await db.createUser(user);

  // 保存到 localStorage 以便快速访问
  localStorage.setItem('userId', user.id);
  localStorage.setItem('username', user.username);
  localStorage.setItem('email', user.email);

  return user;
}

export async function loginUser(
  username: string,
  password: string
): Promise<User> {
  const db = await getDB();

  const user = await db.validateUser(username, password);

  if (!user) {
    throw new Error('用户名或密码错误');
  }

  // 保存到 localStorage 以便快速访问
  localStorage.setItem('userId', user.id);
  localStorage.setItem('username', user.username);
  localStorage.setItem('email', user.email || '');

  return user;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');

  if (!userId || !username) {
    return null;
  }

  // 简单返回基本信息，完整验证需要查询数据库
  return {
    id: userId,
    username,
    email: localStorage.getItem('email') || undefined,
    password: '',
    createdAt: '',
  };
}

export function logoutUser(): void {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('token');
}

// ============ 频道操作 ============

export async function loadAllChannels(): Promise<Channel[]> {
  const db = await getDB();
  return await db.getAllChannels();
}

export async function findChannel(channelId: string): Promise<Channel | null> {
  const db = await getDB();
  return await db.getChannel(channelId);
}

export async function findChannelByInviteCode(
  inviteCode: string
): Promise<Channel | null> {
  const db = await getDB();
  return await db.getChannelByInviteCode(inviteCode.toUpperCase());
}

export async function createNewChannel(data: {
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  description?: string;
  password?: string;
  requiresApproval?: boolean;
  ownerId: string;
}): Promise<Channel> {
  const db = await getDB();

  // 检查频道名是否重复
  const channels = await db.getAllChannels();
  if (channels.some(ch => ch.name === data.name)) {
    throw new Error('频道名称已存在');
  }

  // 生成频道ID和邀请码
  const channelId = `ch_${generateCode(8)}`;
  const inviteCode = generateCode(8);

  const channel: Channel = {
    id: channelId,
    inviteCode,
    name: data.name,
    type: data.type,
    description: data.description,
    ownerId: data.ownerId,
    hasPassword: !!data.password,
    requiresApproval: data.requiresApproval || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.createChannel(channel);

  // 保存密码（如果有）
  if (data.password) {
    localStorage.setItem(`channel_password_${channelId}`, data.password);
  }

  return channel;
}

export async function removeChannel(channelId: string): Promise<void> {
  const db = await getDB();
  await db.deleteChannel(channelId);

  // 删除密码
  localStorage.removeItem(`channel_password_${channelId}`);
}

export async function updateChannelData(
  channelId: string,
  updates: Partial<Channel>
): Promise<Channel> {
  const db = await getDB();
  return await db.updateChannel(channelId, updates);
}

// ============ 消息操作 ============

export async function loadChannelMessages(
  channelId: string,
  limit: number = 100
): Promise<Message[]> {
  const db = await getDB();
  return await db.getChannelMessages(channelId, limit);
}

export async function sendNewMessage(data: {
  channelId: string;
  userId: string;
  username: string;
  content: string;
  type?: 'TEXT' | 'SYSTEM';
}): Promise<Message> {
  const db = await getDB();

  const message: Message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    channelId: data.channelId,
    userId: data.userId,
    username: data.username,
    content: data.content,
    type: data.type || 'TEXT',
    createdAt: new Date().toISOString(),
  };

  await db.addMessage(message);

  return message;
}

// ============ 频道成员操作 ============

export async function loadChannelMembers(
  channelId: string
): Promise<ChannelMember[]> {
  const db = await getDB();
  return await db.getChannelMembers(channelId);
}

export async function addChannelMemberData(
  member: ChannelMember
): Promise<ChannelMember> {
  const db = await getDB();
  return await db.addChannelMember(member);
}

export async function updateChannelMemberData(
  memberId: string,
  updates: Partial<ChannelMember>
): Promise<ChannelMember> {
  const db = await getDB();
  return await db.updateChannelMember(memberId, updates);
}

export async function removeChannelMemberData(
  memberId: string
): Promise<void> {
  const db = await getDB();
  await db.removeChannelMember(memberId);
}

// ============ 工具函数 ============

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateInviteCode(): string {
  return generateCode(8);
}

export function verifyChannelPassword(
  channelId: string,
  password: string
): boolean {
  const storedPassword = localStorage.getItem(`channel_password_${channelId}`);
  if (!storedPassword) {
    return true;
  }
  return storedPassword === password;
}
