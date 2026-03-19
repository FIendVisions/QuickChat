// frontend/src/services/api/channel.api.ts

import { Channel } from '@/types/channel.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
   * 获取所有频道（传入 userId 时，私密频道只返回用户参与的）
   */
  async getAll(userId?: string): Promise<Channel[]> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    const url = `${API_URL}/channels${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await handleResponse(response);
    return data.channels || [];
  },

  async getById(id: string): Promise<Channel> {
    const response = await fetch(`${API_URL}/channels/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async create(data: {
    name: string;
    type: 'PUBLIC' | 'PRIVATE';
    description?: string;
    password?: string;
    userId: string;
    username: string;
  }): Promise<Channel> {
    const response = await fetch(`${API_URL}/channels`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建频道失败: ${errorText}`);
    }
    return response.json();
  },

  async join(id: string, password?: string): Promise<any> {
    const userId = localStorage.getItem('userId') || '';
    const username = localStorage.getItem('username') || '';
    const response = await fetch(`${API_URL}/channels/${id}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, username, password }),
    });
    return handleResponse(response);
  },

  async leave(id: string): Promise<void> {
    const userId = localStorage.getItem('userId') || '';
    const response = await fetch(`${API_URL}/channels/${id}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to leave channel');
    }
  },

  async getMembers(channelId: string): Promise<any[]> {
    const response = await fetch(`${API_URL}/channels/${channelId}/members`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

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
      return { messages: [], total: 0, hasMore: false };
    }
    return response.json();
  },
};
