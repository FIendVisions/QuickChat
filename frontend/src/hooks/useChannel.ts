// frontend/src/hooks/useChannel.ts

import { useState, useEffect } from 'react';
import { Channel } from '@/types/channel.types';
import { ChannelType } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';

interface UseChannelResult {
  channels: Channel[];
  publicChannels: Channel[];
  privateChannels: Channel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChannel(): UseChannelResult {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 从后端 API 获取频道列表
      const channelsData = await channelApi.getAll();
      setChannels(channelsData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch channels:', err);
      setError(err.message || '获取频道列表失败');
      // 设置空数组避免UI崩溃
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // 监听频道变化事件
  useEffect(() => {
    const handleChannelsChange = () => {
      console.log('Channels changed, refetching...');
      fetchChannels();
    };

    window.addEventListener('channelsChanged', handleChannelsChange);
    return () => window.removeEventListener('channelsChanged', handleChannelsChange);
  }, []);

  const publicChannels = channels.filter(ch => ch.type === ChannelType.PUBLIC);
  const privateChannels = channels.filter(ch => ch.type === ChannelType.PRIVATE);

  return {
    channels,
    publicChannels,
    privateChannels,
    isLoading,
    error,
    refetch: fetchChannels,
  };
}
