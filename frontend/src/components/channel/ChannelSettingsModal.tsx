// frontend/src/components/channel/ChannelSettingsModal.tsx

'use client';

import { useState } from 'react';
import { Trash2, X, Pencil, Key, Globe, Lock } from 'lucide-react';
import { Channel, ChannelType } from '@/types/channel.types';
import { channelApi } from '@/services/api/channel.api';

interface ChannelSettingsModalProps {
  channel: Channel;
  isOwner: boolean;
  onClose: () => void;
  onDelete?: (channelId: string) => Promise<void>;
  onUpdated?: (channel: Channel) => void;
}

export function ChannelSettingsModal({
  channel,
  isOwner,
  onClose,
  onDelete,
  onUpdated,
}: ChannelSettingsModalProps) {
  const [view, setView] = useState<'main' | 'rename' | 'delete' | 'password'>('main');
  const [newName, setNewName] = useState(channel.name);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelType, setChannelType] = useState<ChannelType>(channel.type);

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === channel.name) return;
    setIsProcessing(true);
    setError(null);
    try {
      const updated = await channelApi.update(channel.id, { name: newName.trim() });
      onUpdated?.(updated);
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      setView('main');
    } catch (err: any) {
      setError(err.message || '修改失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length > 0 && newPassword.length < 4) {
      setError('密码至少4个字符，留空则清除密码');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await channelApi.update(channel.id, { password: newPassword || '' });
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      setView('main');
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || '修改失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleType = async () => {
    const newType = channelType === ChannelType.PUBLIC ? ChannelType.PRIVATE : ChannelType.PUBLIC;
    setIsProcessing(true);
    setError(null);
    try {
      const updated = await channelApi.update(channel.id, { type: newType });
      setChannelType(newType);
      onUpdated?.({ ...channel, ...updated, type: newType });
      window.dispatchEvent(new CustomEvent('channelsChanged'));
    } catch (err: any) {
      setError(err.message || '切换失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmName !== channel.name) {
      setError('频道名称不匹配');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await channelApi.delete(channel.id);
      window.dispatchEvent(new CustomEvent('channelsChanged'));
      onDelete?.(channel.id);
      onClose();
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-normal">
            {view === 'main' && '频道设置'}
            {view === 'rename' && '修改频道名称'}
            {view === 'password' && '修改密码'}
            {view === 'delete' && '删除频道'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-normal transition-colors" disabled={isProcessing}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* 主菜单 */}
          {view === 'main' && (
            <>
              {/* 频道信息 */}
              <div className="bg-bg-tertiary rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-muted">频道名称</span>
                  <span className="text-text-normal font-medium">{channel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">类型</span>
                  <span className="text-text-normal">
                    {channelType === ChannelType.PUBLIC ? '公开' : '私密'}
                  </span>
                </div>
                {channel.description && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">描述</span>
                    <span className="text-text-normal text-right max-w-[200px] truncate">{channel.description}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">频道ID</span>
                  <span className="text-text-muted font-mono text-xs">{channel.id}</span>
                </div>
              </div>

              {isOwner && (
                <div className="space-y-1.5">
                  <p className="text-xs text-text-muted font-medium px-1">管理操作</p>
                  <button
                    onClick={() => { setView('rename'); setError(null); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Pencil size={16} className="text-primary" />
                    <span className="text-sm text-text-normal">修改频道名称</span>
                  </button>
                  <button
                    onClick={handleToggleType}
                    disabled={isProcessing}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors text-left disabled:opacity-50"
                  >
                    {channelType === ChannelType.PUBLIC ? (
                      <>
                        <Lock size={16} className="text-primary" />
                        <div>
                          <span className="text-sm text-text-normal">设为私密频道</span>
                          <p className="text-xs text-text-muted">切换后将不再出现在公开频道页面</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Globe size={16} className="text-success" />
                        <div>
                          <span className="text-sm text-text-normal">设为公开频道</span>
                          <p className="text-xs text-text-muted">切换后所有人可在公开频道页面看到</p>
                        </div>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setView('password'); setError(null); setNewPassword(''); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors text-left"
                  >
                    <Key size={16} className="text-warning" />
                    <span className="text-sm text-text-normal">修改频道密码</span>
                  </button>
                  <button
                    onClick={() => { setView('delete'); setError(null); setDeleteConfirmName(''); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-danger/10 transition-colors text-left"
                  >
                    <Trash2 size={16} className="text-danger" />
                    <span className="text-sm text-danger">删除频道</span>
                  </button>
                </div>
              )}

              {!isOwner && (
                <p className="text-sm text-text-muted text-center py-2">只有频道创建者可以管理设置</p>
              )}
            </>
          )}

          {/* 改名 */}
          {view === 'rename' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-normal mb-1">新名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={32}
                  autoFocus
                />
              </div>
              <ActionButtons
                onCancel={() => setView('main')}
                onConfirm={handleRename}
                confirmLabel="保存"
                isProcessing={isProcessing}
                disabled={!newName.trim() || newName.trim() === channel.name}
              />
            </div>
          )}

          {/* 改密码 */}
          {view === 'password' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-normal mb-1">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码，留空则清除密码"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <ActionButtons
                onCancel={() => setView('main')}
                onConfirm={handleChangePassword}
                confirmLabel="更新密码"
                isProcessing={isProcessing}
              />
            </div>
          )}

          {/* 删除确认 */}
          {view === 'delete' && (
            <div className="space-y-3">
              <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
                <p className="text-sm text-danger font-medium mb-1">此操作不可撤销！</p>
                <p className="text-xs text-text-muted">
                  删除频道将清空所有成员和消息记录。请输入频道名称 <strong className="text-text-normal">{channel.name}</strong> 确认删除。
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={`请输入 "${channel.name}" 确认`}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-danger"
                autoFocus
              />
              <ActionButtons
                onCancel={() => setView('main')}
                onConfirm={handleDelete}
                confirmLabel="确认删除"
                isProcessing={isProcessing}
                disabled={deleteConfirmName !== channel.name}
                danger
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md text-sm text-danger">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ onCancel, onConfirm, confirmLabel, isProcessing, disabled, danger }: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  isProcessing: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        onClick={onCancel}
        disabled={isProcessing}
        className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors text-sm disabled:opacity-50"
      >
        返回
      </button>
      <button
        onClick={onConfirm}
        disabled={isProcessing || disabled}
        className={`flex-1 px-4 py-2 rounded-md text-white text-sm disabled:opacity-50 transition-colors ${
          danger ? 'bg-danger hover:bg-red-600' : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {isProcessing ? '处理中...' : confirmLabel}
      </button>
    </div>
  );
}
