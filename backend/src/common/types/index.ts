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

/** 频道形态：文字 / 语音 / 直播 */
export enum ChannelKind {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
  LIVE = 'LIVE',
}

export enum ServerMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  EMOJI = 'EMOJI',
}
