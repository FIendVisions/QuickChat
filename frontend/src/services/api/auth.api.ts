import { getApiOrigin } from '@/lib/serverOrigin';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

async function handleResponse(response: Response): Promise<AuthResponse> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = data?.message || data?.error || response.statusText || '请求失败';
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return data;
}

export const authApi = {
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${getApiOrigin()}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return handleResponse(response);
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${getApiOrigin()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },
};
