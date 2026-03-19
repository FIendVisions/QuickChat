// frontend/src/components/channel/CreateChannelModal.tsx

'use client';

import { useState } from 'react';
import { Globe, Lock, X, Eye, EyeOff } from 'lucide-react';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: 'public' | 'private';
    description?: string;
    password?: string;
  }) => Promise<void>;
}

export function CreateChannelModal({ onClose, onCreate }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('频道名称不能为空');
      return;
    }
    if (name.length > 32) {
      setError('频道名称最多 32 个字符');
      return;
    }
    if (usePassword && password.length < 4) {
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
        password: usePassword ? password : undefined,
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 频道名称 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">频道名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给频道起个名字"
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCreating}
              maxLength={32}
              autoFocus
            />
            <p className="mt-1 text-xs text-text-muted text-right">{name.length}/32</p>
          </div>

          {/* 频道类型 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-2">频道类型</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'public'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Globe size={24} />
                <div className="text-center">
                  <div className="text-sm font-medium">公开频道</div>
                  <div className="text-[10px] mt-0.5 opacity-70">所有人可见并加入</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('private')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Lock size={24} />
                <div className="text-center">
                  <div className="text-sm font-medium">私密频道</div>
                  <div className="text-[10px] mt-0.5 opacity-70">仅通过频道ID加入</div>
                </div>
              </button>
            </div>
          </div>

          {/* 密码设置（两种类型都可以） */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="usePassword"
                checked={usePassword}
                onChange={(e) => {
                  setUsePassword(e.target.checked);
                  if (!e.target.checked) setPassword('');
                }}
                disabled={isCreating}
                className="w-4 h-4 rounded border-border-color bg-bg-tertiary text-primary focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="usePassword" className="text-sm text-text-normal cursor-pointer">
                设置频道密码
              </label>
            </div>
            {usePassword && (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="设置加入密码（至少4位）"
                  className="w-full px-3 py-2 pr-10 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isCreating}
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-normal"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个频道是做什么的？"
              rows={2}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isCreating}
              maxLength={100}
            />
          </div>

          {/* 类型说明 */}
          <div className="p-3 bg-bg-tertiary rounded-md text-xs text-text-muted">
            {type === 'public' ? (
              <p>公开频道创建后会显示在所有用户的「公开频道」列表中，任何人都可以看到并加入。</p>
            ) : (
              <p>私密频道创建后仅对你可见，其他人需要输入频道ID才能加入。创建成功后可以复制频道ID分享给好友。</p>
            )}
          </div>

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
              className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreating ? '创建中...' : '创建频道'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
