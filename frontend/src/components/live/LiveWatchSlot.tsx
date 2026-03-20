'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useLiveWatch } from '@/contexts/LiveWatchContext';
import { LiveWatchEmbed } from './LiveWatchEmbed';

interface LiveWatchSlotProps {
  /** 当前聊天区所在频道 */
  channelId: string;
}

/**
 * 仅在「当前频道」且 context 中有观看目标时，在聊天区顶部展示嵌入直播条。
 */
export function LiveWatchSlot({ channelId }: LiveWatchSlotProps) {
  const { socket } = useWebSocket();
  const { target, close, setTarget } = useLiveWatch();

  useEffect(() => {
    if (target && target.channelId !== channelId) {
      setTarget(null);
    }
  }, [channelId, target, setTarget]);

  if (!target || target.channelId !== channelId) {
    return null;
  }

  return (
    <LiveWatchEmbed
      socket={socket}
      channelId={channelId}
      broadcasterUserId={target.broadcasterUserId}
      broadcasterName={target.broadcasterName}
      hasScreen={target.screen}
      hasCamera={target.camera}
      onClose={close}
    />
  );
}
