'use client';

import { useState } from 'react';
import { Globe, Lock, X, Eye, EyeOff, Hash, Mic, Video } from 'lucide-react';

interface CreateChannelModalProps {
  onClose: () => void;
  /** 为 true 时表示必须在服务器上下文中创建（应传入 serverId） */
  requireServer?: boolean;
  serverId?: string;
  onCreate: (data: {
    name: string;
    type: 'public' | 'private';
    kind: 'TEXT' | 'VOICE' | 'LIVE';
    description?: string;
    password?: string;
  }) => Promise<void>;
}

export function CreateChannelModal({
  onClose,
  onCreate,
  requireServer,
  serverId,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'TEXT' | 'VOICE' | 'LIVE'>('TEXT');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requireServer && !serverId) {
      setError('请先选择一个服务器');
      return;
    }
    if (!name.trim()) {
      setError('频道名称不能为空');
      return;
    }
    if (name.length > 50) {
      setError('频道名称最多 50 个字符');
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
        kind,
        description: description.trim() || undefined,
        password: usePassword ? password : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建频道失败');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-bg-secondary shadow-xl">
        <div className="flex items-center justify-between border-b border-border-color p-4">
          <h2 className="text-lg font-semibold text-text-normal">创建频道</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text-normal"
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">频道形态</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setKind('TEXT')}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
                  kind === 'TEXT'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Hash size={20} />
                <span className="text-xs font-medium">文字</span>
              </button>
              <button
                type="button"
                onClick={() => setKind('VOICE')}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
                  kind === 'VOICE'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Mic size={20} />
                <span className="text-xs font-medium">语音</span>
              </button>
              <button
                type="button"
                onClick={() => setKind('LIVE')}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all ${
                  kind === 'LIVE'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Video size={20} />
                <span className="text-xs font-medium">直播</span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">频道名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给频道起个名字"
              className="w-full rounded-md border border-border-color bg-bg-tertiary px-3 py-2 text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCreating}
              maxLength={50}
              autoFocus
            />
            <p className="mt-1 text-right text-xs text-text-muted">{name.length}/50</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-normal">可见性</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  type === 'public'
                    ? 'border-success bg-success/10 text-success'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Globe size={24} />
                <div className="text-center">
                  <div className="text-sm font-medium">公开</div>
                  <div className="mt-0.5 text-[10px] opacity-70">可被全站发现（无服务器时）</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('private')}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                  type === 'private'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-color bg-bg-tertiary text-text-muted hover:bg-bg-hover'
                }`}
                disabled={isCreating}
              >
                <Lock size={24} />
                <div className="text-center">
                  <div className="text-sm font-medium">私密</div>
                  <div className="mt-0.5 text-[10px] opacity-70">需邀请或频道 ID</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="usePassword"
                checked={usePassword}
                onChange={(e) => {
                  setUsePassword(e.target.checked);
                  if (!e.target.checked) setPassword('');
                }}
                disabled={isCreating}
                className="h-4 w-4 rounded border-border-color bg-bg-tertiary text-primary focus:ring-2 focus:ring-primary"
              />
              <label htmlFor="usePassword" className="cursor-pointer text-sm text-text-normal">
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
                  className="w-full rounded-md border border-border-color bg-bg-tertiary px-3 py-2 pr-10 text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
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

          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这个频道是做什么的？"
              rows={2}
              className="w-full resize-none rounded-md border border-border-color bg-bg-tertiary px-3 py-2 text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isCreating}
              maxLength={100}
            />
          </div>

          <div className="rounded-md bg-bg-tertiary p-3 text-xs text-text-muted">
            {requireServer ? (
              <p>频道将创建在当前服务器内；服务器成员可见列表中的频道（需先加入服务器）。</p>
            ) : type === 'public' ? (
              <p>无服务器时，公开频道会出现在全站「公开频道」列表中。</p>
            ) : (
              <p>私密频道主要对你可见，他人需使用频道 ID 加入。</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-danger/50 bg-danger/10 p-3">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 rounded-md bg-bg-tertiary px-4 py-2 text-text-normal transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? '创建中...' : '创建频道'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
