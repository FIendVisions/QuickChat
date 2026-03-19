// frontend/src/types/user.types.ts

/**
 * 用户类型
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 用户角色
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

/**
 * 用户状态
 */
export enum UserStatus {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  INVISIBLE = 'INVISIBLE',
  OFFLINE = 'OFFLINE',
}
