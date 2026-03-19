// frontend/src/types/voice.types.ts

/**
 * 说话状态
 */
export enum SpeakingState {
  SPEAKING = 'speaking',
  MUTED = 'muted',
  SILENT = 'silent',
}

/**
 * 参与者接口
 */
export interface Participant {
  userId: string;
  username: string;
  avatar?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  volume?: number;
  joinedAt: number;
}

/**
 * 用户语音状态
 */
export interface UserVoiceState {
  isConnected: boolean;
  isMicrophoneOpen: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number;
  currentChannelId?: string;
}
