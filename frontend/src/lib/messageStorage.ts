// frontend/src/lib/messageStorage.ts

export interface StoredMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  type: 'TEXT' | 'SYSTEM';
}

const STORAGE_KEY = 'quickchat_messages';

/**
 * 获取频道的所有消息
 */
export function getChannelMessages(channelId: string): StoredMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allMessages: StoredMessage[] = data ? JSON.parse(data) : [];
    return allMessages
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch {
    return [];
  }
}

/**
 * 添加新消息
 */
export function addMessage(message: Omit<StoredMessage, 'id' | 'createdAt'>): StoredMessage {
  const newMessage: StoredMessage = {
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allMessages: StoredMessage[] = data ? JSON.parse(data) : [];
    allMessages.push(newMessage);

    // 限制存储的消息数量（每个频道最多100条）
    const channelMessages = allMessages.filter(msg => msg.channelId === message.channelId);
    const otherMessages = allMessages.filter(msg => msg.channelId !== message.channelId);

    if (channelMessages.length > 100) {
      channelMessages.splice(0, channelMessages.length - 100);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherMessages, ...channelMessages]));
  } catch (error) {
    console.error('Failed to save message:', error);
  }

  return newMessage;
}

/**
 * 添加系统消息
 */
export function addSystemMessage(channelId: string, content: string): StoredMessage {
  return addMessage({
    channelId,
    userId: 'system',
    username: '系统',
    content,
    type: 'SYSTEM',
  });
}

/**
 * 清空频道的消息
 */
export function clearChannelMessages(channelId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allMessages: StoredMessage[] = data ? JSON.parse(data) : [];
    const filtered = allMessages.filter(msg => msg.channelId !== channelId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to clear messages:', error);
  }
}
