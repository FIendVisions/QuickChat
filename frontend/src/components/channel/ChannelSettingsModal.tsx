// frontend/src/components/channel/ChannelSettingsModal.tsx

'use client';

import { useState } from 'react';
import { Settings, Trash2, X, Key, Users, Hash, Lock } from 'lucide-react';
import { Channel, ChannelType } from '@/types/channel.types';

interface ChannelSettingsModalProps {
  channel: Channel;
  isOwner: boolean;
  onClose: () => void;
  onDelete?: (channelId: string) => Promise<void>;
  onUpdatePassword?: (channelId: string, newPassword: string) => Promise<void>;
}

/**
 * 频道设置模态框
 * 仅频道创建者可以删除频道和修改设置
 */
export function ChannelSettingsModal({
  channel,
  isOwner,
  onClose,
  onDelete,
  onUpdatePassword,
}: ChannelSettingsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 删除频道
   */
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsProcessing(true);
    setError(null);

    try {
      await onDelete(channel.id);
      onClose();
    } catch (err: any) {
      setError(err.message || '删除频道失败');
      setIsProcessing(false);
    }
  };

  /**
   * 修改密码
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!onUpdatePassword) return;

    if (newPassword.length < 4) {
      setError('密码至少需要 4 个字符');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await onUpdatePassword(channel.id, newPassword);
      alert('密码已更新');
      setNewPassword('');
      setShowChangePassword(false);
    } catch (err: any) {
      setError(err.message || '修改密码失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2">
            {channel.type === ChannelType.PUBLIC ? (
              <Hash className="text-text-muted" size={20} />
            ) : (
              <Lock className="text-text-muted" size={20} />
            )}
            <h2 className="text-lg font-semibold text-text-normal">
              {channel.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-normal transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 space-y-4">
          {/* 频道信息 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-muted">频道信息</h3>
            <div className="bg-bg-tertiary rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-text-muted" />
                <span className="text-sm text-text-normal">
                  类型: {channel.type === ChannelType.PUBLIC ? '公开频道' : '私密频道'}
                </span>
              </div>
              {channel.description && (
                <div className="text-sm text-text-muted">
                  {channel.description}
                </div>
              )}
            </div>
          </div>

          {/* 所有者操作 */}
          {isOwner && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-text-muted">所有者操作</h3>

              {/* 修改密码（仅私密频道） */}
              {channel.type === ChannelType.PRIVATE && onUpdatePassword && !showDeleteConfirm && !showChangePassword && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-bg-tertiary hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
                >
                  <Key size={18} className="text-text-muted" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-normal">修改密码</div>
                    <div className="text-xs text-text-muted">更改频道访问密码</div>
                  </div>
                </button>
              )}

              {/* 删除频道 */}
              {!showDeleteConfirm && !showChangePassword && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-bg-tertiary hover:bg-danger/10 transition-colors text-left disabled:opacity-50"
                >
                  <Trash2 size={18} className="text-danger" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-danger">删除频道</div>
                    <div className="text-xs text-text-muted">
                      永久删除此频道（不可恢复）
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* 删除确认 */}
          {showDeleteConfirm && (
            <div className="bg-danger/10 border border-danger/50 rounded-md p-4 space-y-3">
              <p className="text-sm text-danger">
                确定要删除频道 "{channel.name}" 吗？
              </p>
              <p className="text-xs text-text-muted">
                此操作不可撤销，所有频道成员将被移除。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 bg-bg-secondary text-text-normal rounded-md hover:bg-bg-tertiary transition-colors text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 bg-danger text-white rounded-md hover:bg-red-600 transition-colors text-sm disabled:opacity-50"
                >
                  {isProcessing ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          )}

          {/* 修改密码表单 */}
          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-normal mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少4个字符）"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isProcessing}
                  minLength={4}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setNewPassword('');
                    setError(null);
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 bg-bg-secondary text-text-normal rounded-md hover:bg-bg-tertiary transition-colors text-sm disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !newPassword}
                  className="flex-1 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
                >
                  {isProcessing ? '更新中...' : '更新密码'}
                </button>
              </div>
            </form>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
        </div>

        {/* 非所有者提示 */}
        {!isOwner && (
          <div className="p-4 border-t border-border-color">
            <p className="text-sm text-text-muted text-center">
              只有频道创建者可以修改设置
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
