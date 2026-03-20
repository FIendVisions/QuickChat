export type MessageType = 'TEXT' | 'SYSTEM' | 'EMOJI' | 'IMAGE' | 'FILE';

/** 被回复消息的引用快照（与后端 replyTo 字段一致，可独立解析展示） */
export interface MessageReplyRef {
  id: string;
  userId: string;
  username: string;
  avatar?: string | null;
  content: string;
  createdAt: string;
  type: MessageType;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
}

export interface SendMessagePayload {
  content: string;
  type?: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  /** 后端存储的被回复消息 id */
  replyToId?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
  type: MessageType;
  channelId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  replyToId?: string | null;
  replyTo?: MessageReplyRef | null;
}
