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

export interface ForumPostListItem {
  id: string;
  title: string;
  author: { id: string; username: string; avatar?: string | null };
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
}

export interface ForumComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string | null };
}

export interface ForumPostDetail {
  id: string;
  title: string;
  content: string;
  author: { id: string; username: string; avatar?: string | null };
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: ForumComment[];
}

/** 创建接口返回（无 comments / likedByMe） */
export type ForumPostCreated = Omit<ForumPostDetail, 'likedByMe' | 'comments'>;

export const forumApi = {
  async listPosts(channelId: string, userId: string, q?: string): Promise<{ posts: ForumPostListItem[] }> {
    const params = new URLSearchParams({ userId });
    if (q?.trim()) params.set('q', q.trim());
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/forum/posts?${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createPost(
    channelId: string,
    data: { userId: string; title: string; content: string },
  ): Promise<{ post: ForumPostCreated }> {
    const response = await fetch(`${getApiOrigin()}/channels/${channelId}/forum/posts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getPost(channelId: string, postId: string, userId: string): Promise<{ post: ForumPostDetail }> {
    const params = new URLSearchParams({ userId });
    const response = await fetch(
      `${getApiOrigin()}/channels/${channelId}/forum/posts/${postId}?${params}`,
      { headers: getAuthHeaders() },
    );
    return handleResponse(response);
  },

  async addComment(
    channelId: string,
    postId: string,
    userId: string,
    content: string,
  ): Promise<{ comment: ForumComment }> {
    const response = await fetch(
      `${getApiOrigin()}/channels/${channelId}/forum/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, content }),
      },
    );
    return handleResponse(response);
  },

  async toggleLike(
    channelId: string,
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    const response = await fetch(
      `${getApiOrigin()}/channels/${channelId}/forum/posts/${postId}/like`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId }),
      },
    );
    return handleResponse(response);
  },

  async updatePost(
    channelId: string,
    postId: string,
    data: { userId: string; title?: string; content?: string },
  ): Promise<{ post: ForumPostDetail }> {
    const response = await fetch(
      `${getApiOrigin()}/channels/${channelId}/forum/posts/${postId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );
    return handleResponse(response);
  },
};
