// backend/src/common/types/index.ts

// 重新定义 enum 类型，因为 SQLite 不支持 enum
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  IDLE = 'IDLE',
  INVISIBLE = 'INVISIBLE',
  OFFLINE = 'OFFLINE',
}

export enum ChannelType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  EMOJI = 'EMOJI',
}
