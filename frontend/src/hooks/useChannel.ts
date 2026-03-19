// frontend/src/hooks/useChannel.ts

import { useState, useEffect, useCallback } from 'react';
import { Channel, ChannelType } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';

interface UseChannelResult {
  channels: Channel[];
  publicChannels: Channel[];
  privateChannels: Channel[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChannel(userId?: string): UseChannelResult {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const channelsData = await channelApi.getAll(userId);
      setChannels(channelsData);
    } catch (err: any) {
      console.error('Failed to fetch channels:', err);
      setError(err.message || '获取频道列表失败');
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    const handleChannelsChange = () => fetchChannels();
    window.addEventListener('channelsChanged', handleChannelsChange);
    return () => window.removeEventListener('channelsChanged', handleChannelsChange);
  }, [fetchChannels]);

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
