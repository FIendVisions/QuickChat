import type { ChatMessage } from '@/types/message.types';

/** 用于复制、回复预览等 */
export function messageToPlainText(m: ChatMessage): string {
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
