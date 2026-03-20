import { resolveUploadUrl } from '@/lib/mediaUrl';
import type { ChatMessage, MessageReplyRef, MessageType } from '@/types/message.types';

function mapReplyTo(raw: any): MessageReplyRef | null {
  if (!raw || !raw.id) return null;
  const url = raw.attachmentUrl != null && String(raw.attachmentUrl).length > 0
    ? resolveUploadUrl(String(raw.attachmentUrl))
    : undefined;
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? ''),
    username: String(raw.username ?? '未知用户'),
    avatar: raw.avatar ?? undefined,
    content: String(raw.content ?? ''),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    type: (raw.type || 'TEXT') as MessageType,
    attachmentUrl: url,
    attachmentName: raw.attachmentName ?? undefined,
    attachmentMime: raw.attachmentMime ?? undefined,
  };
}

/** 将频道 REST / WebSocket 消息 JSON 转为前端 ChatMessage */
export function mapChannelMessage(msg: any): ChatMessage {
  const attachmentUrl =
    msg.attachmentUrl != null && String(msg.attachmentUrl).length > 0
      ? resolveUploadUrl(String(msg.attachmentUrl))
      : undefined;

  return {
    id: String(msg.id),
    userId: String(msg.userId ?? ''),
    username: String(msg.username ?? msg.user?.username ?? '未知用户'),
    avatar: msg.avatar ?? msg.user?.avatar,
    content: String(msg.content ?? ''),
    createdAt: typeof msg.createdAt === 'string' ? msg.createdAt : new Date(msg.createdAt).toISOString(),
    type: (msg.type || 'TEXT') as MessageType,
    channelId: msg.channelId,
    attachmentUrl,
    attachmentName: msg.attachmentName ?? undefined,
    attachmentMime: msg.attachmentMime ?? undefined,
    replyToId: msg.replyToId != null ? String(msg.replyToId) : undefined,
    replyTo: mapReplyTo(msg.replyTo),
  };
}

/** 从完整消息生成引用快照（乐观更新 / 回复预览） */
export function messageToReplyRef(m: ChatMessage): MessageReplyRef {
  return {
    id: m.id,
    userId: m.userId,
    username: m.username,
    avatar: m.avatar,
    content: m.content,
    type: m.type,
    createdAt: m.createdAt,
    attachmentUrl: m.attachmentUrl,
    attachmentName: m.attachmentName,
    attachmentMime: m.attachmentMime,
  };
}
