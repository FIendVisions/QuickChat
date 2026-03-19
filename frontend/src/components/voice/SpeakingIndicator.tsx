// frontend/src/components/voice/SpeakingIndicator.tsx

'use client';

import { useEffect, useState } from 'react';

interface SpeakingIndicatorProps {
  isSpeaking?: boolean;
  size?: 'small' | 'medium' | 'large';
  showVolume?: boolean;
  volume?: number; // 0-100
}

/**
 * 说话指示器组件
 * 提供多种视觉展示方式
 */
export function SpeakingIndicator({
  isSpeaking = false,
  size = 'medium',
  showVolume = false,
  volume = 0,
}: SpeakingIndicatorProps) {
  const [animationPhase, setAnimationPhase] = useState(0);

  // 脉动动画
  useEffect(() => {
    if (!isSpeaking) {
      setAnimationPhase(0);
      return;
    }

    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 500);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  if (!isSpeaking) {
    return null;
  }

  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4',
  };

  return (
    <div className="flex items-center gap-1">
      {/* 声波动画 */}
      <div className="flex items-end gap-0.5 h-3">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`
              w-0.5 bg-success rounded-full transition-all duration-150
              ${sizeClasses[size]}
            `}
            style={{
              height: isSpeaking
                ? `${20 + (Math.sin((animationPhase + i) * Math.PI / 2) + 1) * 30}%`
                : '20%',
              opacity: isSpeaking ? 1 : 0.3,
            }}
          />
        ))}
      </div>

      {/* 音量条（可选） */}
      {showVolume && (
        <div className="ml-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={`
                w-1 h-3 rounded-full transition-all duration-100
                ${volume >= level * 20 ? 'bg-success' : 'bg-bg-tertiary'}
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 头像光环组件
 * 用于头像周围的说话指示光环
 */
interface SpeakingRingProps {
  isSpeaking: boolean;
  children: React.ReactNode;
}

export function SpeakingRing({ isSpeaking, children }: SpeakingRingProps) {
  return (
    <div className="relative inline-block">
      {/* 光环 */}
      {isSpeaking && (
        <div className="absolute -inset-1 rounded-full bg-success opacity-30 animate-ping" />
      )}

      {/* 内容 */}
      {children}
    </div>
  );
}
