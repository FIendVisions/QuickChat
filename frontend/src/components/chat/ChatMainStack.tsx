'use client';

import { type DragEvent, type RefObject } from 'react';
import { MessageList, type MessageListRef } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChannelMembers } from '@/components/channel/ChannelMembers';
import { LiveWatchPlayer } from '@/components/live/LiveWatchPlayer';
import { DanmakuChatPanel } from '@/components/live/DanmakuChatPanel';
import { useLiveWatch } from '@/contexts/LiveWatchContext';
import type { Channel } from '@/types/channel.types';
import { ChannelKind } from '@/types/channel.types';
import type { ChatMessage, SendMessagePayload } from '@/types/message.types';
import type { EveryonePin } from '@/types/pin.types';
import { VoiceChannelMain } from './VoiceChannelMain';
import { ForumChannelMain } from './ForumChannelMain';

export interface ChatMainStackProps {
  channel: Channel;
  user: { id: string; username: string };
  token: string | null;
  isOwner: boolean;
  isOfficialChannel: boolean;
  messageListRef: RefObject<MessageListRef | null>;
  replyTo: ChatMessage | null;
  setReplyTo: (v: ChatMessage | null) => void;
  personalPinIds: string[];
  everyonePins: EveryonePin[];
  onTogglePersonalPin: (id: string) => void;
  onToggleEveryonePin: (id: string) => Promise<void>;
  onUnpinEveryone: (id: string) => Promise<void>;
  onEveryonePinsRefresh: () => void;
  onMessageSend: (p: SendMessagePayload) => Promise<void>;
  chatDragOver: boolean;
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDragOverCapture: (e: DragEvent) => void;
  onDropCapture: (e: DragEvent) => void;
  onLeaveChannel: () => void;
  onOpenSettings: () => void;
}

/**
 * 根据是否在观看直播，切换「整栏直播间 + 弹幕」与「常规聊天」布局。
 */
export function ChatMainStack({
  channel,
  user,
  token,
  isOwner,
  isOfficialChannel,
  messageListRef,
  replyTo,
  setReplyTo,
  personalPinIds,
  everyonePins,
  onTogglePersonalPin,
  onToggleEveryonePin,
  onUnpinEveryone,
  onEveryonePinsRefresh,
  onMessageSend,
  chatDragOver,
  onDragEnter,
  onDragLeave,
  onDragOverCapture,
  onDropCapture,
  onLeaveChannel,
  onOpenSettings,
}: ChatMainStackProps) {
  const { target, close } = useLiveWatch();

  const liveActive =
    !!target &&
    target.channelId === channel.id &&
    (target.screen || target.camera);

  const kind = channel.kind ?? ChannelKind.TEXT;
  const channelMark =
    kind === ChannelKind.VOICE ? '🔊' : kind === ChannelKind.FORUM ? '📋' : channel.type === 'PUBLIC' ? '#' : '🔒';

  const titleBar = (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-black/20 bg-dc-chat px-4 shadow-dc-header">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xl leading-none text-dc-channel-text">{channelMark}</span>
        <h2 className="truncate text-base font-semibold text-dc-channel-text-active">{channel.name}</h2>
        {kind === ChannelKind.FORUM && (
          <span className="shrink-0 rounded bg-[#5865f2]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#949cf7]">
            论坛
          </span>
        )}
        {liveActive && (
          <span className="shrink-0 rounded bg-[#f23f43]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#f23f43]">
            直播中
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {isOwner && !isOfficialChannel && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded p-2 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
            title="频道设置"
          >
            ⚙️
          </button>
        )}
        {!isOfficialChannel && (
          <button
            type="button"
            onClick={onLeaveChannel}
            className="rounded px-3 py-1.5 text-sm font-medium text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
          >
            退出频道
          </button>
        )}
      </div>
    </div>
  );

  if (liveActive && target) {
    return (
      <>
        {titleBar}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-black">
            <LiveWatchPlayer
              channelId={channel.id}
              viewerUserId={user.id}
              broadcasterUserId={target.broadcasterUserId}
              broadcasterName={target.broadcasterName}
              hasScreen={target.screen}
              hasCamera={target.camera}
              statusSlot={
                <div className="absolute left-3 top-3 z-20 flex max-w-[min(92%,420px)] flex-wrap items-center gap-2 rounded-md bg-black/75 px-2 py-1.5 text-[11px] text-white shadow-lg backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 rounded bg-white/15 px-2 py-1 font-medium hover:bg-white/25"
                  >
                    ← 返回聊天
                  </button>
                  <span className="font-medium text-primary">{target.broadcasterName}</span>
                  <span className="text-white/70">的直播</span>
                </div>
              }
            />
            <DanmakuChatPanel
              channelId={channel.id}
              userId={user.id}
              username={user.username}
              token={token}
            />
          </div>
          <ChannelMembers channelId={channel.id} userId={user.id} isOwner={isOwner} />
        </div>
      </>
    );
  }

  if (kind === ChannelKind.FORUM) {
    return (
      <ForumChannelMain
        channel={channel}
        user={user}
        isOwner={isOwner}
        isOfficialChannel={isOfficialChannel}
        onLeaveChannel={onLeaveChannel}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  if (kind === ChannelKind.VOICE) {
    return (
      <>
        {titleBar}
        <VoiceChannelMain
          channel={channel}
          user={user}
          token={token}
          isOwner={isOwner}
          messageListRef={messageListRef}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          personalPinIds={personalPinIds}
          everyonePins={everyonePins}
          onTogglePersonalPin={onTogglePersonalPin}
          onToggleEveryonePin={onToggleEveryonePin}
          onUnpinEveryone={onUnpinEveryone}
          onEveryonePinsRefresh={onEveryonePinsRefresh}
          onMessageSend={onMessageSend}
          chatDragOver={chatDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOverCapture={onDragOverCapture}
          onDropCapture={onDropCapture}
        />
      </>
    );
  }

  return (
    <>
      {titleBar}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-dc-chat ${chatDragOver ? 'ring-2 ring-inset ring-primary' : ''}`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOverCapture={onDragOverCapture}
          onDropCapture={onDropCapture}
        >
          {chatDragOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/15 text-sm font-medium text-text-normal backdrop-blur-[1px]">
              松开鼠标发送文件
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MessageList
              ref={messageListRef}
              channelId={channel.id}
              userId={user.id}
              onReply={setReplyTo}
              personalPinIds={personalPinIds}
              everyonePins={everyonePins}
              onTogglePersonalPin={onTogglePersonalPin}
              onToggleEveryonePin={onToggleEveryonePin}
              onUnpinEveryone={onUnpinEveryone}
              onEveryonePinsRefresh={onEveryonePinsRefresh}
            />
          </div>
          <div className="shrink-0 border-t border-black/20 bg-dc-chat px-4 py-3">
            <MessageInput
              channelId={channel.id}
              currentUserId={user.id}
              currentUsername={user.username}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSend={onMessageSend}
            />
          </div>
        </div>
        <ChannelMembers channelId={channel.id} userId={user.id} isOwner={isOwner} />
      </div>
    </>
  );
}
