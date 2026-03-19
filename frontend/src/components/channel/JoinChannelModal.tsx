// frontend/src/components/channel/JoinChannelModal.tsx

'use client';

import { useState } from 'react';
import { X, LogIn, Lock, Globe, Hash } from 'lucide-react';
import { channelApi } from '@/services/api/channel.api';

interface JoinChannelModalProps {
  onClose: () => void;
  onJoin: (channelId: string) => void;
  currentUserId: string;
}

export function JoinChannelModal({ onClose, onJoin, currentUserId }: JoinChannelModalProps) {
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [foundChannel, setFoundChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleSearchChannel = async () => {
    setError(null);
    setFoundChannel(null);
    setPassword('');
    setIsSearching(true);

    try {
      const channelId = input.trim();
      if (!channelId) {
        throw new Error('请输入频道ID');
      }

      const channel = await channelApi.getById(channelId);
      if (!channel) {
        throw new Error('频道不存在或已被删除');
      }

      setFoundChannel(channel);
    } catch (err: any) {
      setError(err.message || '查找频道失败');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!foundChannel) return;
    setError(null);
    setIsJoining(true);

    try {
      await channelApi.join(foundChannel.id, password || undefined);
      onJoin(foundChannel.id);
      onClose();
    } catch (err: any) {
      setError(err.message || '加入频道失败');
    } finally {
      setIsJoining(false);
    }
  };

  const needsPassword = foundChannel?.hasPassword;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2">
            <LogIn className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-text-normal">加入频道</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-normal transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 频道ID输入 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">频道ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); setFoundChannel(null); }}
                placeholder="输入频道ID"
                className="flex-1 px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleSearchChannel()}
              />
              <button
                onClick={handleSearchChannel}
                disabled={isSearching || !input.trim()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                {isSearching ? '查找...' : '查找'}
              </button>
            </div>
          </div>

          {/* 找到频道后显示信息 */}
          {foundChannel && (
            <>
              <div className="p-3 bg-bg-tertiary rounded-lg border border-border-color">
                <div className="flex items-center gap-2 mb-1">
                  {foundChannel.type === 'PRIVATE' ? (
                    <Lock size={16} className="text-primary" />
                  ) : (
                    <Hash size={16} className="text-success" />
                  )}
                  <span className="font-medium text-text-normal">{foundChannel.name}</span>
                  {needsPassword && (
                    <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded">需要密码</span>
                  )}
                </div>
                {foundChannel.description && (
                  <p className="text-xs text-text-muted mt-1">{foundChannel.description}</p>
                )}
                <p className="text-xs text-text-muted mt-1">
                  {foundChannel.type === 'PRIVATE' ? '私密频道' : '公开频道'}
                  {foundChannel.participantCount !== undefined && ` · ${foundChannel.participantCount} 成员`}
                </p>
              </div>

              {/* 密码输入（仅有密码的频道显示） */}
              {needsPassword && (
                <div>
                  <label className="block text-sm font-medium text-text-normal mb-1">频道密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="输入频道密码"
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}

          {/* 未找到频道时的说明 */}
          {!foundChannel && !error && (
            <div className="p-3 bg-bg-tertiary rounded-md text-xs text-text-muted">
              <p className="font-medium mb-1">如何加入私密频道？</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>向频道创建者索要频道ID</li>
                <li>在上方输入频道ID并点击查找</li>
                <li>如有密码则输入密码，点击加入</li>
              </ol>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors"
            >
              取消
            </button>
            {foundChannel && (
              <button
                onClick={handleJoin}
                disabled={isJoining || (needsPassword && !password)}
                className="flex-1 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? '加入中...' : '加入频道'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
