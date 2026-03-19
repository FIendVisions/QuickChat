// frontend/src/services/api/channel.api.ts

import { Channel } from '@/types/channel.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * 获取认证头（如果有的话）
 */
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // 如果有 token，添加到请求头
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

export const channelApi = {
  /**
   * 获取所有频道
   */
  async getAll(): Promise<Channel[]> {
    const response = await fetch(`${API_URL}/channels`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return data.channels || [];
  },

  /**
   * 获取频道详情
   */
  async getById(id: string): Promise<Channel> {
    const response = await fetch(`${API_URL}/channels/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * 创建频道
   */
  async create(data: {
    name: string;
    type: 'PUBLIC' | 'PRIVATE';
    description?: string;
    password?: string;
  }): Promise<Channel> {
    console.log('🔄 Creating channel with data:', data);
    console.log('🔄 API URL:', `${API_URL}/channels`);

    try {
      const response = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      console.log('🔄 Response status:', response.status);
      console.log('🔄 Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Channel created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Create channel error:', error);
      throw error;
    }
  },

  /**
   * 加入频道
   */
  async join(id: string, password?: string): Promise<any> {
    const response = await fetch(`${API_URL}/channels/${id}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password }),
    });
    return handleResponse(response);
  },

  /**
   * 退出频道
   */
  async leave(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/channels/${id}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to leave channel');
    }
  },

  /**
   * 获取频道成员列表
   */
  async getMembers(channelId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/channels/${channelId}/members`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * 获取频道消息
   */
  async getMessages(channelId: string, page: number = 1, pageSize: number = 50): Promise<{
    messages: any[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await fetch(
      `${API_URL}/channels/${channelId}/messages?page=${page}&pageSize=${pageSize}`,
      {
        headers: getAuthHeaders(),
      }
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

  /**
   * 发送消息
   */
  async sendMessage(channelId: string, content: string): Promise<any> {
    const response = await fetch(`${API_URL}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },
};
