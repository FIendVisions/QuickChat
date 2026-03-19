// frontend/src/hooks/useVoiceEnhanced.ts

/**
 * 语音 Hook (更新版)
 * 集成真实的音频分析功能
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useMediaStream } from './useMediaStream';
import { useVoiceStore } from '@/store/voiceStore';
import { AudioAnalyzer } from '@/services/webrtc/audio-analyzer';
import { SpeakingDetector } from '@/services/webrtc/speaking-detector';
import { Participant } from '@/types/voice.types';

interface UseVoiceOptions {
  userId: string;
  token?: string;
  channelId?: string;
  autoJoin?: boolean;
  autoCalibrate?: boolean; // 是否自动校准
}

/**
 * 语音 Hook（增强版）
 * 管理语音通话状态、音频分析和说话检测
 */
export function useVoiceEnhanced({
  userId,
  token,
  channelId,
  autoJoin = false,
  autoCalibrate = true,
}: UseVoiceOptions) {
  const { socket, connected, emit, on, off } = useWebSocket({ userId, token });
  const {
    stream,
    requestStream,
    releaseStream,
    toggleTrack,
    getTrack,
  } = useMediaStream({ audio: true, video: false });

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

  // 音频分析器和检测器
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const speakingDetectorRef = useRef<SpeakingDetector | null>(null);
  const lastSpeakingEventRef = useRef<number>(0);

  /**
   * 初始化音频分析器
   */
  const initializeAudioAnalyzer = useCallback(async () => {
    if (!stream) {
      console.warn('No media stream available');
      return;
    }

    try {
      // 创建音频分析器
      audioAnalyzerRef.current = new AudioAnalyzer();
      await audioAnalyzerRef.current.initialize(stream);

      // 可选：自动校准阈值
      if (autoCalibrate) {
        await calibrateThreshold();
      } else {
        console.log('Using default threshold: -30dB');
      }

      console.log('Audio analyzer initialized');
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
    }
  }, [stream, autoCalibrate]);

  /**
   * 校准环境噪音阈值
   */
  const calibrateThreshold = useCallback(async (duration: number = 3000) => {
    if (!audioAnalyzerRef.current) {
      return;
    }

    console.log('Starting microphone calibration...');

    const noiseSamples: number[] = [];
    const startTime = Date.now();

    // 采集噪音样本
    while (Date.now() - startTime < duration) {
      const volume = audioAnalyzerRef.current.getVolume();
      noiseSamples.push(volume);
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 计算噪音底（平均值 + 标准差）
    const mean = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;
    const variance = noiseSamples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / noiseSamples.length;
    const stdDev = Math.sqrt(variance);

    // 噪音底 + 15dB 作为阈值
    const threshold = mean + stdDev + 15;

    console.log(`Calibration complete. Noise floor: ${mean.toFixed(2)}dB, StdDev: ${stdDev.toFixed(2)}dB`);
    console.log(`Calculated threshold: ${threshold.toFixed(2)}dB`);

    // 更新检测器阈值
    if (speakingDetectorRef.current) {
      (speakingDetectorRef.current as any).options.threshold = threshold;
    }

    return threshold;
  }, []);

  /**
   * 初始化说话检测器
   */
  const initializeSpeakingDetector = useCallback(() => {
    if (!audioAnalyzerRef.current || !audioAnalyzerRef.current.ready) {
      console.warn('Audio analyzer not ready');
      return;
    }

    // 创建说话检测器
    speakingDetectorRef.current = new SpeakingDetector(audioAnalyzerRef.current, {
      threshold: -30, // 可以通过校准调整
      debounce: 200,
      silenceDelay: 500,
      onSpeakingStart: () => {
        console.log('Started speaking');
        notifySpeakingState(true);
      },
      onSpeakingEnd: () => {
        console.log('Stopped speaking');
        notifySpeakingState(false);
      },
    });

    // 开始检测
    speakingDetectorRef.current.start();

    console.log('Speaking detector initialized');
  }, []);

  /**
   * 通知服务器说话状态
   */
  const notifySpeakingState = useCallback((isSpeaking: boolean) => {
    const now = Date.now();

    // 限流：最多每 100ms 发送一次
    if (now - lastSpeakingEventRef.current < 100) {
      return;
    }

    // 检查麦克风是否开启
    if (!isMicrophoneOpen) {
      console.warn('Cannot send speaking state: microphone is closed');
      return;
    }

    // 检查 WebSocket 连接
    if (!connected) {
      console.warn('Cannot send speaking state: WebSocket not connected');
      return;
    }

    // 发送状态
    emit('speaking_state_change', {
      isSpeaking,
      volume: audioAnalyzerRef.current?.getVolumePercentage() || 0,
      timestamp: now,
    });

    lastSpeakingEventRef.current = now;
  }, [isMicrophoneOpen, connected, emit]);

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
        rtpCapabilities: {},
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
    // 停止检测
    if (speakingDetectorRef.current) {
      speakingDetectorRef.current.stop();
      speakingDetectorRef.current = null;
    }

    // 清理音频分析器
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.destroy();
      audioAnalyzerRef.current = null;
    }

    // 释放媒体流
    if (stream) {
      releaseStream();
    }

    // 发送退出事件
    if (currentChannelId && connected) {
      emit('leave_voice_channel', {
        channelId: currentChannelId,
      });
    }

    // 清理状态
    setConnected(false);
    setMicrophoneOpen(false);
    clearParticipants();
    setCurrentChannelId(undefined);
  }, [currentChannelId, connected, emit, stream, releaseStream, setConnected, setMicrophoneOpen, clearParticipants]);

  /**
   * 开启麦克风
   */
  const openMicrophone = useCallback(async () => {
    try {
      // 请求麦克风权限
      if (!stream) {
        await requestStream();
      }

      // 启用音频轨道
      const audioTrack = getTrack('audio');
      if (audioTrack) {
        audioTrack.enabled = true;
      }

      // 初始化音频分析
      if (!audioAnalyzerRef.current) {
        await initializeAudioAnalyzer();
      }

      // 初始化说话检测
      if (!speakingDetectorRef.current) {
        initializeSpeakingDetector();
      }

      setMicrophoneOpen(true);
      console.log('Microphone opened');
    } catch (error) {
      console.error('Failed to open microphone:', error);
      throw error;
    }
  }, [stream, requestStream, getTrack, initializeAudioAnalyzer, initializeSpeakingDetector, setMicrophoneOpen]);

  /**
   * 关闭麦克风
   */
  const closeMicrophone = useCallback(() => {
    // 停止检测
    if (speakingDetectorRef.current) {
      speakingDetectorRef.current.stop();
    }

    // 禁用音频轨道
    if (stream) {
      const audioTrack = getTrack('audio');
      if (audioTrack) {
        audioTrack.enabled = false;
      }
    }

    // 发送停止说话事件
    if (connected && isMicrophoneOpen) {
      emit('speaking_state_change', {
        isSpeaking: false,
        volume: 0,
        timestamp: Date.now(),
      });
    }

    setMicrophoneOpen(false);
    console.log('Microphone closed');
  }, [stream, getTrack, connected, isMicrophoneOpen, emit, setMicrophoneOpen]);

  /**
   * 切换麦克风
   */
  const toggleMicrophone = useCallback(async () => {
    if (isMicrophoneOpen) {
      closeMicrophone();
    } else {
      await openMicrophone();
    }
  }, [isMicrophoneOpen, openMicrophone, closeMicrophone]);

  /**
   * 手动校准麦克风
   */
  const calibrateMicrophone = useCallback(async () => {
    if (!stream || !audioAnalyzerRef.current) {
      throw new Error('Microphone not opened');
    }

    const threshold = await calibrateThreshold();
    return threshold;
  }, [stream, calibrateThreshold]);

  /**
   * 监听 WebSocket 事件
   */
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: { userId: string; username: string; channelId: string }) => {
      addParticipant({
        userId: data.userId,
        username: data.username,
        isMuted: true,
        isSpeaking: false,
        joinedAt: Date.now(),
      });
    };

    const handleUserLeft = (data: { userId: string; channelId: string }) => {
      removeParticipant(data.userId);
    };

    const handleSpeakingStateChange = (data: { userId: string; isSpeaking: boolean; volume?: number }) => {
      setSpeaking(data.userId, data.isSpeaking);
      updateParticipant(data.userId, {
        isSpeaking: data.isSpeaking,
        volume: data.volume,
      });
    };

    const handleMicrophoneStateChange = (data: { userId: string; isMuted: boolean }) => {
      updateParticipant(data.userId, {
        isMuted: data.isMuted,
      });
    };

    on('user_joined', handleUserJoined);
    on('user_left', handleUserLeft);
    on('user_speaking_state_changed', handleSpeakingStateChange);
    on('user_microphone_state_changed', handleMicrophoneStateChange);

    return () => {
      off('user_joined', handleUserJoined);
      off('user_left', handleUserLeft);
      off('user_speaking_state_changed', handleSpeakingStateChange);
      off('user_microphone_state_changed', handleMicrophoneStateChange);
    };
  }, [socket, on, off, addParticipant, removeParticipant, updateParticipant, setSpeaking]);

  /**
   * 清理资源
   */
  useEffect(() => {
    return () => {
      // 组件卸载时清理
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.destroy();
      }
      if (speakingDetectorRef.current) {
        speakingDetectorRef.current.destroy();
      }
      if (stream) {
        releaseStream();
      }
    };
  }, [stream, releaseStream]);

  // 自动加入
  useEffect(() => {
    if (autoJoin && channelId && connected) {
      joinChannel(channelId);
    }

    return () => {
      if (isConnected) {
        leaveChannel();
      }
    };
  }, [autoJoin, channelId, connected, joinChannel, leaveChannel, isConnected]);

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
    currentChannelId,

    // 音频相关
    stream,
    audioLevel: audioAnalyzerRef.current?.getVolumePercentage() || 0,

    // 方法
    joinChannel,
    leaveChannel,
    toggleMicrophone,
    openMicrophone,
    closeMicrophone,
    // toggleDeafen, // TODO: implement deafen functionality
    calibrateMicrophone,

    // 计算属性
    participantCount: participantsArray.length,
  };
}
