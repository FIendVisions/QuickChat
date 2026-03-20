'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LiveWatchTarget } from '@/types/liveWatch.types';

interface LiveWatchContextValue {
  target: LiveWatchTarget | null;
  setTarget: (t: LiveWatchTarget | null) => void;
  close: () => void;
}

const LiveWatchContext = createContext<LiveWatchContextValue | null>(null);

export function LiveWatchProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState<LiveWatchTarget | null>(null);

  const setTarget = useCallback((t: LiveWatchTarget | null) => {
    setTargetState(t);
  }, []);

  const close = useCallback(() => setTargetState(null), []);

  const value = useMemo(
    () => ({ target, setTarget, close }),
    [target, setTarget, close],
  );

  return (
    <LiveWatchContext.Provider value={value}>{children}</LiveWatchContext.Provider>
  );
}

export function useLiveWatch(): LiveWatchContextValue {
  const ctx = useContext(LiveWatchContext);
  if (!ctx) {
    throw new Error('useLiveWatch 必须在 LiveWatchProvider 内使用');
  }
  return ctx;
}
