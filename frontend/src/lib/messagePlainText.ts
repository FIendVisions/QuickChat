import type { ChatMessage, MessageReplyRef } from '@/types/message.types';

/** 引用条展示用一行摘要（不含「回复 @」前缀） */
export function replyRefSnippetPlain(m: MessageReplyRef): string {
  const parts: string[] = [];
  const c = (m.content || '').trim();
  if (c) parts.push(c);
  if (m.type === 'IMAGE' || m.attachmentMime?.startsWith('image/')) {
    parts.push('[图片]');
  } else if (m.attachmentUrl) {
    parts.push(`[文件: ${m.attachmentName || '附件'}]`);
  }
  return parts.join(' ').trim() || '（无文本内容）';
}

function replySnippetPlain(m: NonNullable<ChatMessage['replyTo']>): string {
  return replyRefSnippetPlain(m);
}

/** 用于复制、回复预览等 */
export function messageToPlainText(m: ChatMessage): string {
  const parts: string[] = [];
  if (m.replyTo) {
    parts.push(`[回复 @${m.replyTo.username}: ${replySnippetPlain(m.replyTo)}]`);
  }
  const c = (m.content || '').trim();
  if (c) parts.push(c);
  if (m.type === 'IMAGE' || m.attachmentMime?.startsWith('image/')) {
    parts.push('[图片]');
  } else if (m.attachmentUrl) {
    parts.push(`[文件: ${m.attachmentName || '附件'}]`);
  }
  return parts.join(' ').trim() || '（无文本内容）';
}
