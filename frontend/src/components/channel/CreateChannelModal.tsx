// frontend/src/components/channel/CreateChannelModal.tsx

'use client';

import { useState } from 'react';
import { Hash, Lock, MessageSquare, Volume2, X } from 'lucide-react';
import { ChannelType } from '@/types/channel.types';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: 'public' | 'private';
    description?: string;
    password?: string;
    requiresApproval?: boolean;
  }) => Promise<void>;
}

/**
 * 创建频道模态框
 * 支持公开/私密频道选择，私密频道需要密码
 */
export function CreateChannelModal({ onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!name.trim()) {
      setError('频道名称不能为空');
      return;
    }

    if (name.length > 32) {
      setError('频道名称最多 32 个字符');
      return;
    }

    if (type === 'private' && !password.trim()) {
      setError('私密频道需要设置密码');
      return;
    }

    if (type === 'private' && password.length < 4) {
      setError('私密频道需要设置密码');
      return;
    }

    if (type === 'private' && password.length < 4) {
      setError('密码至少需要 4 个字符');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        password: type === 'private' ? password : undefined,
        requiresApproval,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || '创建频道失败');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-normal">创建频道</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-normal transition-colors"
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 频道名称 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">
              频道名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：开黑语音、闲聊区"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCreating}
              maxLength={32}
            />
            <p className="mt-1 text-xs text-text-muted">
              {name.length}/32
            </p>
          </div>

          {/* 频道类型 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-2">
              频道类型
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-md border transition-all
                  ${type === 'public'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-normal hover:bg-bg-hover'
                  }
                `}
                disabled={isCreating}
              >
                <MessageSquare size={20} />
                <div className="flex-1 text-left">
                  <div className="font-medium">公开频道</div>
                  <div className="text-xs text-text-muted">
                    所有人可见，仅支持文字聊天
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('private')}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-md border transition-all
                  ${type === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-normal hover:bg-bg-hover'
                  }
                `}
                disabled={isCreating}
              >
                <Lock size={20} />
                <div className="flex-1 text-left">
                  <div className="font-medium">私密频道</div>
                  <div className="text-xs text-text-muted">
                    需要密码才能加入，支持语音聊天
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 密码（仅私密频道） */}
          {type === 'private' && (
            <div>
              <label className="block text-sm font-medium text-text-normal mb-1">
                频道密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="设置频道密码"
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isCreating}
                minLength={4}
              />
              <p className="mt-1 text-xs text-text-muted">
                至少 4 个字符
              </p>
            </div>
          )}

          {/* 描述（可选） */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个频道是用来做什么的？"
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isCreating}
              maxLength={100}
            />
            <p className="mt-1 text-xs text-text-muted">
              {description.length}/100
            </p>
          </div>

          {/* 需要审核 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              disabled={isCreating}
              className="w-4 h-4 rounded border-border-color bg-bg-tertiary text-primary focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="requiresApproval" className="text-sm text-text-normal cursor-pointer">
              需要审核才能加入频道
            </label>
          </div>
          {requiresApproval && (
            <p className="text-xs text-text-muted">
              启用后，用户加入需要创建者或管理员审批
            </p>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? '创建中...' : '创建频道'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
