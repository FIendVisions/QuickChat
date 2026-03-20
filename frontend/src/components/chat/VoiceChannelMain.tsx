'use client';

import { useState, type DragEvent, type RefObject } from 'react';
import { MessageList, type MessageListRef } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { ChannelMembers } from '@/components/channel/ChannelMembers';
import { useVoiceEnhanced } from '@/hooks/useVoiceEnhanced';
import { VoiceRoom } from '@/components/voice/VoiceRoom';
import { VoiceControlsEnhanced } from '@/components/voice/VoiceControlsEnhanced';
import type { Channel } from '@/types/channel.types';
import type { ChatMessage, SendMessagePayload } from '@/types/message.types';
import type { EveryonePin } from '@/types/pin.types';
import { Sliders } from 'lucide-react';

export interface VoiceChannelMainProps {
  channel: Channel;
  user: { id: string; username: string };
  token: string | null;
  isOwner: boolean;
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
}

/**
 * 语音频道主区：语音网格 + 可选文字聊天 + 成员列表
 */
export function VoiceChannelMain({
  channel,
  user,
  token,
  isOwner,
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
}: VoiceChannelMainProps) {
  const [showChat, setShowChat] = useState(true);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const {
    isConnected,
    isMicrophoneOpen,
    isDeafened,
    participants,
    speakingUsers,
    audioLevel,
    joinChannel: voiceJoinChannel,
    leaveChannel: voiceLeaveChannel,
    toggleMicrophone,
    calibrateMicrophone,
  } = useVoiceEnhanced({
    userId: user.id,
    token: token || undefined,
    channelId: channel.id,
    autoJoin: true,
    autoCalibrate: false,
  });

  const handleCalibrate = async () => {
    try {
      setIsCalibrating(true);
      await calibrateMicrophone();
    } catch {
      /* handled in hook */
    } finally {
      setIsCalibrating(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isCalibrating && (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-lg bg-warning px-4 py-2 text-sm text-white shadow-xl">
              <Sliders size={16} className="animate-pulse" />
              正在校准麦克风…
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <VoiceRoom
            channelId={channel.id}
            participants={participants}
            speakingUsers={new Set(speakingUsers)}
          />
        </div>

        {showChat && (
          <div
            className={`relative flex min-h-0 max-h-[45vh] flex-col border-t border-black/20 bg-dc-chat ${chatDragOver ? 'ring-2 ring-inset ring-primary' : ''}`}
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
            <div className="min-h-0 flex-1 overflow-hidden">
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
        )}

        <VoiceControlsEnhanced
          isConnected={isConnected}
          isMicrophoneOpen={isMicrophoneOpen}
          isDeafened={isDeafened}
          audioLevel={audioLevel}
          isCalibrating={isCalibrating}
          onToggleMicrophone={toggleMicrophone}
          onToggleDeafen={() => {}}
          onToggleChat={() => setShowChat((v) => !v)}
          onLeave={() => {
            voiceLeaveChannel();
          }}
          onCalibrate={handleCalibrate}
          showChat={showChat}
          showCalibrate
        />
      </div>
      <ChannelMembers channelId={channel.id} userId={user.id} isOwner={isOwner} />
    </div>
  );
}
