export type MessageType = 'TEXT' | 'SYSTEM' | 'EMOJI' | 'IMAGE' | 'FILE';

export interface SendMessagePayload {
  content: string;
  type?: MessageType;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
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
}
