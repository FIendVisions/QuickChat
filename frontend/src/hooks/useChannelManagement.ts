// frontend/src/hooks/useChannelManagement.ts

/**
 * 频道管理 Hook
 * 处理创建、加入、退出频道等操作
 */
import { useCallback, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import { useChannelStore } from '@/store/channelStore';
import { useVoiceStore } from '@/store/voiceStore';

interface CreateChannelData {
  name: string;
  type: 'public' | 'private';
  description?: string;
  password?: string;
  requiresApproval?: boolean;
}

interface UseChannelManagementOptions {
  userId: string;
  token?: string;
  onCreateSuccess?: (channelId: string) => void;
  onJoinSuccess?: (channelId: string) => void;
  onLeaveSuccess?: () => void;
}

/**
 * 频道管理 Hook
 */
export function useChannelManagement({
  userId,
  token,
  onCreateSuccess,
  onJoinSuccess,
  onLeaveSuccess,
}: UseChannelManagementOptions) {
  const { socket, connected, emit, once, off } = useWebSocket({ userId, token });
  const { activeChannelId, setActiveChannel } = useChannelStore();
  const { isConnected: isVoiceConnected } = useVoiceStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 创建频道
   */
  const createChannel = useCallback(async (data: CreateChannelData) => {
    if (!connected) {
      throw new Error('未连接到服务器');
    }

    setIsCreating(true);
    setError(null);

    return new Promise<string>((resolve, reject) => {
      // 监听创建结果
      const handleSuccess = (result: { channelId: string }) => {
        setIsCreating(false);
        onCreateSuccess?.(result.channelId);
        resolve(result.channelId);
      };

      const handleError = (err: { message: string }) => {
        setIsCreating(false);
        setError(err.message);
        reject(new Error(err.message));
      };

      once('channel_created', handleSuccess);
      once('channel_create_error', handleError);

      // 发送创建请求
      emit('create_channel', {
        name: data.name,
        type: data.type,
        description: data.description,
        password: data.password,
        requiresApproval: data.requiresApproval,
      });

      // 超时处理
      setTimeout(() => {
        setIsCreating(false);
        // Note: once() automatically removes the listener after first call
        // No need to manually off here
        reject(new Error('创建频道超时'));
      }, 10000);
    });
  }, [connected, socket, emit, onCreateSuccess]);

  /**
   * 加入频道（需要密码）
   */
  const joinChannel = useCallback(async (
    channelId: string,
    password?: string
  ) => {
    if (!connected) {
      throw new Error('未连接到服务器');
    }

    setIsJoining(true);
    setError(null);

    return new Promise<void>((resolve, reject) => {
      // 监听加入结果
      const handleSuccess = () => {
        setIsJoining(false);
        setActiveChannel(channelId);
        onJoinSuccess?.(channelId);
        resolve();
      };

      const handleError = (err: { message: string }) => {
        setIsJoining(false);
        setError(err.message);
        reject(new Error(err.message));
      };

      once('channel_joined', handleSuccess);
      once('channel_join_error', handleError);

      // 发送加入请求
      emit('join_channel', {
        channelId,
        password,
      });

      // 超时处理
      setTimeout(() => {
        setIsJoining(false);
        // Note: once() automatically removes the listener after first call
        reject(new Error('加入频道超时'));
      }, 10000);
    });
  }, [connected, socket, emit, setActiveChannel, onJoinSuccess]);

  /**
   * 退出频道
   */
  const leaveChannel = useCallback(async () => {
    if (!activeChannelId) {
      throw new Error('当前不在任何频道中');
    }

    if (!connected) {
      throw new Error('未连接到服务器');
    }

    setIsLeaving(true);
    setError(null);

    return new Promise<void>((resolve, reject) => {
      // 监听退出结果
      const handleSuccess = () => {
        setIsLeaving(false);
        setActiveChannel(null);
        onLeaveSuccess?.();
        resolve();
      };

      const handleError = (err: { message: string }) => {
        setIsLeaving(false);
        setError(err.message);
        reject(new Error(err.message));
      };

      once('channel_left', handleSuccess);
      once('channel_leave_error', handleError);

      // 发送退出请求
      emit('leave_channel', {
        channelId: activeChannelId,
      });

      // 超时处理
      setTimeout(() => {
        setIsLeaving(false);
        // Note: once() automatically removes the listener after first call
        reject(new Error('退出频道超时'));
      }, 5000);
    });
  }, [activeChannelId, connected, socket, emit, setActiveChannel, onLeaveSuccess]);

  /**
   * 删除频道（仅创建者）
   */
  const deleteChannel = useCallback(async (channelId: string) => {
    if (!connected) {
      throw new Error('未连接到服务器');
    }

    setError(null);

    return new Promise<void>((resolve, reject) => {
      const handleSuccess = () => {
        resolve();
      };

      const handleError = (err: { message: string }) => {
        setError(err.message);
        reject(new Error(err.message));
      };

      once('channel_deleted', handleSuccess);
      once('channel_delete_error', handleError);

      emit('delete_channel', {
        channelId,
      });

      setTimeout(() => {
        // Note: once() automatically removes the listener after first call
        reject(new Error('删除频道超时'));
      }, 10000);
    });
  }, [connected, socket, emit]);

  return {
    // 状态
    isCreating,
    isJoining,
    isLeaving,
    error,

    // 方法
    createChannel,
    joinChannel,
    leaveChannel,
    deleteChannel,
  };
}
