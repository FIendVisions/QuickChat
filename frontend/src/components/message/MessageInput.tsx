// frontend/src/components/message/MessageInput.tsx

'use client';

import { useState, useRef, FormEvent } from 'react';
import { Send, Smile, Paperclip, ImageIcon, X } from 'lucide-react';
import { messageApi } from '@/services/api/message.api';
import { channelApi } from '@/services/api/channel.api';
import { messageToReplyRef } from '@/lib/mapChannelMessage';
import { replyRefSnippetPlain } from '@/lib/messagePlainText';
import type { ChatMessage, SendMessagePayload } from '@/types/message.types';

interface MessageInputProps {
  channelId: string;
  currentUserId?: string;
  currentUsername?: string;
  /** 右键「回复」选中的消息 */
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onSend?: (payload: SendMessagePayload) => Promise<void>;
}

export function MessageInput({
  channelId,
  currentUserId,
  currentUsername,
  replyTo = null,
  onCancelReply,
  onSend,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendPayload = async (payload: SendMessagePayload) => {
    const userId = currentUserId || localStorage.getItem('userId') || 'anonymous';
    const username = currentUsername || localStorage.getItem('username') || '匿名用户';

    const replyToId =
      replyTo && !replyTo.id.startsWith('temp-') ? replyTo.id : undefined;

    const outgoing: SendMessagePayload = {
      ...payload,
      content: payload.content ?? '',
      replyToId,
    };

    if (onSend) {
      await onSend(outgoing);
      return;
    }

    await messageApi.send(channelId, userId, username, {
      content: outgoing.content,
      type: outgoing.type,
      attachmentUrl: outgoing.attachmentUrl,
      attachmentName: outgoing.attachmentName,
      attachmentMime: outgoing.attachmentMime,
      replyToId: outgoing.replyToId,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content || isSending || isUploading) return;

    setIsSending(true);
    try {
      await sendPayload({ content, type: 'TEXT' });
      setMessage('');
    } catch (error: any) {
      console.error('❌ 发送消息失败:', error);
      alert(`发送失败: ${error.message || '未知错误'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const uploadAndSendFile = async (file: File, preferImage: boolean) => {
    if (!file || isSending || isUploading) return;
    setIsUploading(true);
    try {
      const uploaded = await channelApi.uploadAttachment(channelId, file);
      const caption = message.trim();
      const isImage =
        uploaded.mimeType?.startsWith('image/') ?? preferImage;
      await sendPayload({
        content: caption,
        type: isImage ? 'IMAGE' : 'FILE',
        attachmentUrl: uploaded.url,
        attachmentName: uploaded.filename,
        attachmentMime: uploaded.mimeType,
      });
      setMessage('');
    } catch (err: any) {
      alert(err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, preferImage: boolean) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await uploadAndSendFile(file, preferImage);
  };

  const busy = isSending || isUploading;

  return (
    <div className="w-full space-y-1.5">
      {replyTo && (
        <div className="flex items-start gap-2 rounded-lg border border-black/20 bg-dc-channels px-3 py-2 text-xs">
          <span className="min-w-0 flex-1 text-dc-channel-text">
            <span className="font-semibold text-primary">回复</span>{' '}
            <span className="text-dc-channel-text-active">@{replyTo.username}</span>
            <span className="block truncate opacity-80">
              {replyRefSnippetPlain(messageToReplyRef(replyTo))}
            </span>
          </span>
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
            title="取消回复"
            onClick={() => onCancelReply?.()}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-1 rounded-lg bg-dc-input px-1 py-1"
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelected(e, true)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFileSelected(e, false)}
        />

        <button
          type="button"
          className="shrink-0 rounded-md p-2 text-dc-channel-text hover:bg-black/20 hover:text-dc-channel-text-active disabled:opacity-40"
          title="发送图片"
          disabled={busy}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon size={20} />
        </button>
        <button
          type="button"
          className="shrink-0 rounded-md p-2 text-dc-channel-text hover:bg-black/20 hover:text-dc-channel-text-active disabled:opacity-40"
          title="发送文件"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} />
        </button>

        <button
          type="button"
          className="shrink-0 rounded-md p-2 text-dc-channel-text hover:bg-black/20 hover:text-dc-channel-text-active"
          title="表情"
        >
          <Smile size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isUploading ? '上传中…' : '输入消息…'}
            rows={1}
            className="max-h-32 w-full resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-dc-channel-text-active placeholder:text-dc-channel-text focus:outline-none"
            disabled={busy}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || busy}
          className="shrink-0 rounded-md p-2 text-dc-channel-text hover:bg-black/20 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          title="发送文字"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
