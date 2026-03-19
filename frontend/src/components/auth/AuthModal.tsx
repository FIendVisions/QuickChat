// frontend/src/components/auth/AuthModal.tsx

'use client';

import { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
}

/**
 * 注册/登录模态框
 */
export function AuthModal({ onClose, onLogin, onRegister }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        await onLogin(formData.username, formData.password);
      } else {
        // 注册
        if (formData.password !== formData.confirmPassword) {
          throw new Error('两次输入的密码不一致');
        }

        if (formData.password.length < 6) {
          throw new Error('密码至少需要6个字符');
        }

        await onRegister(formData.username, formData.email, formData.password);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-normal">
            {isLogin ? '登录' : '注册'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-normal transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">
              用户名
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="输入用户名"
                className="w-full pl-10 pr-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* 邮箱 (仅注册时显示) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-text-normal mb-1">
                邮箱
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="输入邮箱"
                  className="w-full pl-10 pr-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          )}

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-text-normal mb-1">
              密码
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="输入密码"
                className="w-full pl-10 pr-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* 确认密码 (仅注册时显示) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-text-normal mb-1">
                确认密码
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="再次输入密码"
                  className="w-full pl-10 pr-3 py-2 bg-bg-tertiary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-bg-tertiary text-text-normal rounded-md hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : isLogin ? '登录' : '注册'}
            </button>
          </div>

          {/* 切换登录/注册 */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              className="text-sm text-primary hover:underline"
              disabled={loading}
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？去登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
