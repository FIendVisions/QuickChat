// frontend/src/services/api/channel.api.ts

import { Channel } from '@/types/channel.types';
import { getApiOrigin } from '@/lib/serverOrigin';

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
  async getAll(userId?: string, options?: { myOnly?: boolean }): Promise<Channel[]> {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (options?.myOnly) params.set('myOnly', 'true');
    const url = `${getApiOrigin()}/channels${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    const data = await handleResponse(response);
    return (data.channels || []).map((ch: any) => ({
      ...ch,
      ownerId: ch.ownerId || ch.owner?.id,
    }));
  },

  async getById(id: string): Promise<Channel> {
    const response = await fetch(`${getApiOrigin()}/channels/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return { ...data, ownerId: data.ownerId || data.owner?.id };
  },

  async create(data: {
    name: string;
    type: 'PUBLIC' | 'PRIVATE';
    description?: string;
    password?: string;
    userId: string;
    username: string;
  }): Promise<Channel> {
    const response = await fetch(`${getApiOrigin()}/channels`, {
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
    const response = await fetch(`${getApiOrigin()}/channels/${id}/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, username, password }),
    });
    return handleResponse(response);
  },

  async update(id: string, data: { name?: string; description?: string; password?: string; type?: string }): Promise<Channel> {
    const userId = localStorage.getItem('userId') || '';
    const response = await fetch(`${getApiOrigin()}/channels/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...data, userId }),
    });
    return handleResponse(response);
  },

  async delete(id: string): Promise<void> {
    const userId = localStorage.getItem('userId') || '';
    const response = await fetch(`${getApiOrigin()}/channels/${id}/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || '删除频道失败');
    }
  },

  async leave(id: string): Promise<void> {
    const userId = localStorage.getItem('userId') || '';
    const response = await fetch(`${getApiOrigin()}/channels/${id}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error('Failed to leave channel');
    }
  },

  async getMembers(channelId: string): Promise<any[]> {
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/members`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async uploadAttachment(channelId: string, file: File): Promise<{
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const form = new FormData();
    form.append('file', file);
    const headers: HeadersInit = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/upload`, {
      method: 'POST',
      headers,
      body: form,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || '上传失败');
    }
    return response.json();
  },

  async getMessages(channelId: string, page: number = 1, pageSize: number = 50): Promise<{
    messages: any[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await fetch(
      `${getApiOrigin()}/channels/${channelId}/messages?page=${page}&pageSize=${pageSize}`,
      { headers: getAuthHeaders() }
    );
    if (!response.ok) {
      return { messages: [], total: 0, hasMore: false };
    }
    return response.json();
  },

  /** 全员置顶列表 */
  async getPins(channelId: string): Promise<{
    pins: { messageId: string; pinnedByUserId: string; pinnedByUsername: string; createdAt: string }[];
  }> {
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/pins`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      return { pins: [] };
    }
    return handleResponse(response);
  },

  async addEveryonePin(
    channelId: string,
    messageId: string,
    userId: string,
  ): Promise<{
    pins: { messageId: string; pinnedByUserId: string; pinnedByUsername: string; createdAt: string }[];
  }> {
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/pins`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messageId, userId }),
    });
    return handleResponse(response);
  },

  async removeEveryonePin(
    channelId: string,
    messageId: string,
    userId: string,
  ): Promise<{
    pins: { messageId: string; pinnedByUserId: string; pinnedByUsername: string; createdAt: string }[];
  }> {
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/pins/remove`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ messageId, userId }),
    });
    return handleResponse(response);
  },
};
