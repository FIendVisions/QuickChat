// frontend/src/services/api/message.api.ts

import { Channel } from '@/types/channel.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * 获取认证头（如果有的话）
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * 处理 API 错误响应
 */
async function handleResponse(response: Response): Promise<any> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.message || errorData?.error || response.statusText;
    throw new Error(errorMessage);
  }
  return response.json();
}

export const messageApi = {
  /**
   * 发送消息到频道
   */
  async send(channelId: string, content: string, userId: string, username: string): Promise<any> {
    console.log('📤 发送消息到频道:', channelId, '内容:', content);

    try {
      const response = await fetch(`${API_URL}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content,
          userId,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '发送消息失败');
      }

      const message = await response.json();
      console.log('✅ 消息发送成功:', message);
      return message;
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      throw error;
    }
  },

  /**
   * 获取频道消息历史
   */
  async getMessages(channelId: string, page: number = 1, pageSize: number = 50): Promise<{
    messages: any[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await fetch(
      `${API_URL}/channels/${channelId}/messages?page=${page}&pageSize=${pageSize}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      // 如果API不存在，返回空数据
      return {
        messages: [],
        total: 0,
        hasMore: false,
      };
    }

    return response.json();
  },
};
