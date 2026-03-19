// frontend/src/components/channel/PasswordPromptModal.tsx

'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordPromptModalProps {
  channelName: string;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
}

/**
 * 密码输入模态框
 * 用于加入私密频道时输入密码
 */
export function PasswordPromptModal({
  channelName,
  onClose,
  onSubmit,
}: PasswordPromptModalProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(password.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || '密码错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-sm mx-4">
        {/* 图标 */}
        <div className="flex justify-center pt-6">
          <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center">
            <Lock size={32} className="text-text-muted" />
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mt-4 px-6">
          <h2 className="text-xl font-semibold text-text-normal">
            私密频道
          </h2>
          <p className="text-sm text-text-muted mt-1">
            请输入密码加入 "{channelName}"
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="频道密码"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '加入中...' : '加入频道'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
