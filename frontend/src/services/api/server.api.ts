import type { ServerCategory, ServerSummary } from '@/types/server.types';
import { getApiOrigin } from '@/lib/serverOrigin';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
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

export const serverApi = {
  async listMine(userId: string): Promise<ServerSummary[]> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(`${getApiOrigin()}/servers?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return data.servers || [];
  },

  async create(data: { name: string; icon?: string; userId: string; username: string }): Promise<ServerSummary> {
    const response = await fetch(`${getApiOrigin()}/servers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async joinByInvite(data: { inviteCode: string; userId: string; username: string }): Promise<ServerSummary> {
    const response = await fetch(`${getApiOrigin()}/servers/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async leave(serverId: string, userId: string): Promise<void> {
    const response = await fetch(`${getApiOrigin()}/servers/${serverId}/leave`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || '退出服务器失败');
    }
  },

  async deleteServer(serverId: string, userId: string): Promise<void> {
    const response = await fetch(`${getApiOrigin()}/servers/${serverId}/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || '删除服务器失败');
    }
  },

  async listCategories(serverId: string, userId: string): Promise<ServerCategory[]> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(`${getApiOrigin()}/servers/${serverId}/categories?${params}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse(response);
    return data.categories || [];
  },

  async createCategory(serverId: string, userId: string, name: string): Promise<ServerCategory> {
    const response = await fetch(`${getApiOrigin()}/servers/${serverId}/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, name }),
    });
    return handleResponse(response);
  },

  async updateCategory(serverId: string, categoryId: string, userId: string, name: string): Promise<ServerCategory> {
    const response = await fetch(`${getApiOrigin()}/servers/${serverId}/categories/${categoryId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, name }),
    });
    return handleResponse(response);
  },

  async deleteCategory(serverId: string, categoryId: string, userId: string): Promise<void> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(
      `${getApiOrigin()}/servers/${serverId}/categories/${categoryId}?${params}`,
      { method: 'DELETE', headers: getAuthHeaders() },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || '删除分组失败');
    }
  },
};
