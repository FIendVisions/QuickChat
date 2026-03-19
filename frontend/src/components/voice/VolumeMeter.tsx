// frontend/src/components/voice/VolumeMeter.tsx

'use client';

interface VolumeMeterProps {
  volume: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  color?: 'success' | 'warning' | 'danger';
}

/**
 * 音量条组件
 * 可视化显示音频音量
 */
export function VolumeMeter({ volume, size = 'medium', color = 'success' }: VolumeMeterProps) {
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4',
  };

  const colorClasses = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };

  return (
    <div className={`flex items-center gap-0.5 ${sizeClasses[size]}`}>
      {/* 5个音量块 */}
      {[1, 2, 3, 4, 5].map((level) => {
        const isActive = volume >= level * 20;
        const opacity = isActive ? 1 : 0.2;

        return (
          <div
            key={level}
            className={`
              w-1 rounded-full transition-all duration-100
              ${isActive ? colorClasses[color] : 'bg-bg-tertiary'}
            `}
            style={{
              opacity,
            }}
          />
        );
      })}
    </div>
  );
}
