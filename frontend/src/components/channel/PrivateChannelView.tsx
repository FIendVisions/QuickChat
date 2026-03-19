// frontend/src/components/channel/PrivateChannelView.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Channel } from '@/types/channel.types';
import { useVoiceEnhanced } from '@/hooks/useVoiceEnhanced';
import { useChannelManagement } from '@/hooks/useChannelManagement';
import { VoiceRoom } from '@/components/voice/VoiceRoom';
import { VoiceControlsEnhanced } from '@/components/voice/VoiceControlsEnhanced';
import { MessageList } from '@/components/message/MessageList';
import { MessageInput } from '@/components/message/MessageInput';
import { MemberList } from '@/components/member/MemberList';
import { Sliders } from 'lucide-react';

interface PrivateChannelViewProps {
  channel: Channel;
  userId: string;
}

/**
 * 私有频道视图（增强版）
 * 集成真实的音频分析和说话检测
 */
export function PrivateChannelView({ channel, userId }: PrivateChannelViewProps) {
  const router = useRouter();
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
    // toggleDeafen, // TODO: implement in useVoiceEnhanced
    calibrateMicrophone,
  } = useVoiceEnhanced({
    userId,
    channelId: channel.id,
    autoJoin: false, // 手动加入
    autoCalibrate: false, // 手动校准
  });

  const { leaveChannel: apiLeaveChannel, isLeaving } = useChannelManagement({
    userId,
    onLeaveSuccess: () => {
      // 退出后返回频道列表
      router.push('/channels');
    },
  });

  /**
   * 完整的退出流程
   */
  const handleLeave = async () => {
    if (isLeaving) return;

    try {
      // 1. 离开语音房间
      voiceLeaveChannel();

      // 2. 离开 API 频道
      await apiLeaveChannel();
    } catch (error) {
      console.error('Failed to leave channel:', error);
      // 即使失败也尝试跳转
      router.push('/channels');
    }
  };

  /**
   * 校准麦克风
   */
  const handleCalibrate = async () => {
    try {
      setIsCalibrating(true);
      await calibrateMicrophone();
      alert('麦克风校准完成！\n\n已根据环境噪音自动调整检测阈值。');
    } catch (error: any) {
      console.error('Calibration failed:', error);
      alert('校准失败：' + error.message);
    } finally {
      setIsCalibrating(false);
    }
  };

  /**
   * 切换聊天面板
   */
  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  return (
    <div className="flex h-full relative">
      {/* 校准提示 */}
      {isCalibrating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-warning text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2">
            <div className="animate-spin">
              <Sliders size={16} />
            </div>
            <span className="text-sm">正在校准麦克风... 请保持安静</span>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 语音房间区域 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <VoiceRoom
            channelId={channel.id}
            participants={participants}
            speakingUsers={new Set(speakingUsers)}
          />
        </div>

        {/* 消息区域（可折叠） */}
        {showChat && (
          <div className="border-t border-bg-secondary">
            <MessageList channelId={channel.id} userId={userId} />
            <MessageInput channelId={channel.id} currentUserId={userId} currentUsername={userId} />
          </div>
        )}

        {/* 语音控制栏（增强版） */}
        <VoiceControlsEnhanced
          isConnected={isConnected}
          isMicrophoneOpen={isMicrophoneOpen}
          isDeafened={isDeafened}
          audioLevel={audioLevel}
          isCalibrating={isCalibrating}
          onToggleMicrophone={toggleMicrophone}
          onToggleDeafen={() => console.log('Deafen functionality not implemented')}
          onToggleChat={handleToggleChat}
          onLeave={handleLeave}
          onCalibrate={handleCalibrate}
          showChat={showChat}
          showCalibrate={true}
        />
      </div>

      {/* 右侧成员列表 */}
      <div className="w-60 border-l border-bg-secondary">
        <MemberList channelId={channel.id} />
      </div>
    </div>
  );
}
