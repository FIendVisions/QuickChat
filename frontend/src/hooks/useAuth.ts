// frontend/src/hooks/useAuth.ts

import { useState, useCallback, useEffect } from 'react';
import { User, UserRole, UserStatus } from '@/types/user.types';
import { getCurrentUser, logoutUser } from '@/lib/dbHelpers';
import { initDB } from '@/lib/db';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  USERNAME: 'username',
  EMAIL: 'email',
};

/**
 * 认证 Hook
 * 使用 IndexedDB 存储用户数据
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 初始化
   */
  useEffect(() => {
    const init = async () => {
      try {
        console.log('useAuth: Initializing...');

        // 初始化数据库
        await initDB();
        console.log('useAuth: Database initialized');

        // 检查登录状态
        const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const savedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
        const savedUsername = localStorage.getItem(STORAGE_KEYS.USERNAME);

        console.log('useAuth: Saved data:', { savedToken, savedUserId, savedUsername });

        if (savedToken && savedUserId && savedUsername) {
          const currentUser = await getCurrentUser();

          if (currentUser) {
            const mockUser: User = {
              id: currentUser.id,
              username: currentUser.username,
              email: currentUser.email,
              role: UserRole.USER,
              status: UserStatus.ONLINE,
              createdAt: currentUser.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            setUser(mockUser);
            setToken(savedToken);
            console.log('useAuth: User authenticated:', mockUser);
          }
        }
      } catch (error) {
        console.error('useAuth: Error during init:', error);
      } finally {
        setIsLoading(false);
        console.log('useAuth: Init complete, isLoading = false');
      }
    };

    init();
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    setToken(null);
  }, []);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    logout,
  };
}
