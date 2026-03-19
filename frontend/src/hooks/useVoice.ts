// frontend/src/hooks/useVoice.ts

import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useVoiceStore } from '@/store/voiceStore';
import { Participant } from '@/types/voice.types';

interface UseVoiceOptions {
  userId: string;
  token?: string;
  channelId?: string;
  autoJoin?: boolean;
}

/**
 * 语音 Hook
 * 管理语音通话状态和交互
 */
export function useVoice({ userId, token, channelId, autoJoin = false }: UseVoiceOptions) {
  const { socket, connected, emit, on, off } = useWebSocket({ userId, token });

  const {
    isConnected,
    isMicrophoneOpen,
    isDeafened,
    participants,
    speakingUsers,
    userVolumes,
    setConnected,
    setMicrophoneOpen,
    setDeafened,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setSpeaking,
    clearParticipants,
  } = useVoiceStore();

  const [currentChannelId, setCurrentChannelId] = useState<string | undefined>(channelId);

  /**
   * 加入语音频道
   */
  const joinChannel = useCallback(async (targetChannelId: string) => {
    if (!connected) {
      console.warn('WebSocket not connected');
      return false;
    }

    try {
      emit('join_voice_channel', {
        channelId: targetChannelId,
        rtpCapabilities: {}, // TODO: 获取真实的 RTP capabilities
      });

      setCurrentChannelId(targetChannelId);
      return true;
    } catch (error) {
      console.error('Failed to join voice channel:', error);
      return false;
    }
  }, [connected, emit]);

  /**
   * 退出语音频道
   */
  const leaveChannel = useCallback(() => {
    if (currentChannelId) {
      emit('leave_voice_channel', {
        channelId: currentChannelId,
      });

      // 清理状态
      setConnected(false);
      setMicrophoneOpen(false);
      clearParticipants();
      setCurrentChannelId(undefined);
    }
  }, [currentChannelId, emit, setConnected, setMicrophoneOpen, clearParticipants]);

  /**
   * 开启/关闭麦克风
   */
  const toggleMicrophone = useCallback(() => {
    const newState = !isMicrophoneOpen;
    setMicrophoneOpen(newState);

    // 发送状态更新
    emit('microphone_state_change', {
      isMuted: !newState,
    });

    // 如果关闭麦克风，同时停止说话状态
    if (!newState) {
      emit('speaking_state_change', {
        isSpeaking: false,
        volume: 0,
      });
    }
  }, [isMicrophoneOpen, setMicrophoneOpen, emit]);

  /**
   * 开启/关闭耳聋（听不到别人）
   */
  const toggleDeafen = useCallback(() => {
    const newState = !isDeafened;
    setDeafened(newState);
    // TODO: 实现音频静音逻辑
  }, [isDeafened, setDeafened]);

  /**
   * 监听 WebSocket 事件
   */
  useEffect(() => {
    if (!socket) return;

    // 用户加入
    const handleUserJoined = (data: { userId: string; username: string; channelId: string }) => {
      addParticipant({
        userId: data.userId,
        username: data.username,
        isMuted: true,
        isSpeaking: false,
        joinedAt: Date.now(),
      });
    };

    // 用户离开
    const handleUserLeft = (data: { userId: string; channelId: string }) => {
      removeParticipant(data.userId);
    };

    // 说话状态变化
    const handleSpeakingStateChange = (data: { userId: string; isSpeaking: boolean; volume?: number }) => {
      setSpeaking(data.userId, data.isSpeaking);
      updateParticipant(data.userId, {
        isSpeaking: data.isSpeaking,
        volume: data.volume,
      });
    };

    // 麦克风状态变化
    const handleMicrophoneStateChange = (data: { userId: string; isMuted: boolean }) => {
      updateParticipant(data.userId, {
        isMuted: data.isMuted,
      });
    };

    // 注册事件监听
    on('user_joined', handleUserJoined);
    on('user_left', handleUserLeft);
    on('user_speaking_state_changed', handleSpeakingStateChange);
    on('user_microphone_state_changed', handleMicrophoneStateChange);

    // 清理函数
    return () => {
      off('user_joined', handleUserJoined);
      off('user_left', handleUserLeft);
      off('user_speaking_state_changed', handleSpeakingStateChange);
      off('user_microphone_state_changed', handleMicrophoneStateChange);
    };
  }, [socket, on, off, addParticipant, removeParticipant, updateParticipant, setSpeaking]);

  // 自动加入
  useEffect(() => {
    if (autoJoin && channelId && connected) {
      joinChannel(channelId);
    }

    return () => {
      // 组件卸载时退出频道
      if (isConnected) {
        leaveChannel();
      }
    };
  }, [autoJoin, channelId, connected]);

  // 获取参与者数组
  const participantsArray = Array.from(participants.values());
  const speakingUsersArray = Array.from(speakingUsers);

  return {
    // 状态
    isConnected,
    isMicrophoneOpen,
    isDeafened,
    participants: participantsArray,
    speakingUsers: speakingUsersArray,
    userVolumes,

    // 方法
    joinChannel,
    leaveChannel,
    toggleMicrophone,
    toggleDeafen,

    // 计算属性
    participantCount: participantsArray.length,
  };
}
