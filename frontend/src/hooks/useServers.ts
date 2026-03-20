import { useState, useEffect, useCallback } from 'react';
import type { ServerSummary } from '@/types/server.types';
import { serverApi } from '@/services/api/server.api';

export function useServers(userId?: string) {
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async (): Promise<ServerSummary[]> => {
    if (!userId) {
      setServers([]);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const list = await serverApi.listMine(userId);
      setServers(list);
      return list;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载服务器失败');
      setServers([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    const onChange = () => void fetchServers();
    window.addEventListener('serversChanged', onChange);
    return () => window.removeEventListener('serversChanged', onChange);
  }, [fetchServers]);

  return { servers, isLoading, error, refetch: fetchServers };
}
