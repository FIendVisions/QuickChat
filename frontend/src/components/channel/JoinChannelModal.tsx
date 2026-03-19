// frontend/src/components/channel/JoinChannelModal.tsx

'use client';

import { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { channelApi } from '@/services/api/channel.api';

interface JoinChannelModalProps {
  onClose: () => void;
  onJoin: (channelId: string) => void;
  currentUserId: string;
}

/**
 * 加入频道模态框
 * 支持通过频道ID加入
 * 使用后端 API 查找频道
 */
export function JoinChannelModal({ onClose, onJoin, currentUserId }: JoinChannelModalProps) {
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [foundChannel, setFoundChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  /**
   * 查找频道（支持频道ID）
   */
  const handleSearchChannel = async () => {
    setError(null);
    setIsSearching(true);

    try {
      const inputCode = input.trim();

      console.log('Searching for channel:', inputCode);

      if (inputCode.length === 0) {
        throw new Error('请输入频道ID');
      }

      // 从后端 API 查找频道
      const channel = await channelApi.getById(inputCode);

      console.log('Found channel:', channel);

      if (!channel) {
        throw new Error('频道不存在或已被删除');
      }

      // 检查是否需要密码
      if (channel.hasPassword) {
        setNeedPassword(true);
        setFoundChannel(channel);
        setIsSearching(false);
      } else {
        // 直接加入（调用后端 API）
        await channelApi.join(channel.id);
        onJoin(channel.id);
        onClose();
      }
    } catch (err: any) {
      console.error('Error searching channel:', err);
      setError(err.message || '查找频道失败');
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * 加入频道（需要密码的情况）
   */
  const handleJoinWithPassword = async () => {
    setError(null);
    setIsJoining(true);

    try {
      if (!foundChannel) {
        throw new Error('频道信息错误');
      }

      // 调用后端 API 加入频道（带密码验证）
      await channelApi.join(foundChannel.id, password);

      onJoin(foundChannel.id);
      onClose();
    } catch (err: any) {
      console.error('Error joining channel:', err);
      setError(err.message || '加入频道失败');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <div className="flex items-center gap-2">
            <LogIn className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-text-normal">
              {needPassword ? '输入密码' : '加入频道'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-normal transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-4 space-y-4">
          {!needPassword ? (
            <>
              {/* 频道ID输入 */}
              <div>
                <label className="block text-sm font-medium text-text-normal mb-1">
                  频道ID
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="输入频道ID"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center text-lg"
                />
                <p className="mt-1 text-xs text-text-muted text-center">
                  输入完整的频道ID（例如：ch_ABC12345）
                </p>
              </div>

              {/* 使用说明 */}
              <div className="p-3 bg-bg-tertiary rounded-md text-xs text-text-muted">
                <p className="font-medium mb-1">💡 如何加入其他人的频道？</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>让频道创建者在频道详情中复制频道ID</li>
                  <li>将频道ID粘贴到上方输入框</li>
                  <li>点击"查找频道"即可加入</li>
                </ol>
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
                  className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSearchChannel}
                  disabled={isSearching || !input.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '查找中...' : '查找频道'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 找到频道信息 */}
              <div className="p-3 bg-bg-tertiary rounded-md">
                <p className="text-sm font-medium text-text-normal">
                  {foundChannel.name}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {foundChannel.description || '这是一个私密频道'}
                </p>
              </div>

              {/* 密码输入 */}
              <div>
                <label className="block text-sm font-medium text-text-normal mb-1">
                  频道密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="输入频道密码"
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  onClick={() => {
                    setNeedPassword(false);
                    setFoundChannel(null);
                    setPassword('');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleJoinWithPassword}
                  disabled={!password || isJoining}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? '加入中...' : '加入'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
