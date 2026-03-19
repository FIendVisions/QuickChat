// frontend/src/lib/db.ts

/**
 * IndexedDB 数据库封装
 * 提供稳定的本地数据存储
 */

const DB_NAME = 'QuickChatDB';
const DB_VERSION = 1;

// 数据库表名
export const STORES = {
  USERS: 'users',
  CHANNELS: 'channels',
  MESSAGES: 'messages',
  CHANNEL_MEMBERS: 'channel_members',
  INVITE_CODES: 'invite_codes',
} as const;

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'PUBLIC' | 'PRIVATE';
  description?: string;
  ownerId: string;
  hasPassword: boolean;
  requiresApproval: boolean;
  inviteCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  type: 'TEXT' | 'SYSTEM';
  createdAt: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  joinedAt: string;
  isOnline: boolean;
}

interface InviteCode {
  code: string;
  channelId: string;
  createdAt: string;
}

class Database {
  public db: IDBDatabase | null = null;

  /**
   * 打开数据库连接
   */
  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建用户表
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
          userStore.createIndex('username', 'username', { unique: true });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // 创建频道表
        if (!db.objectStoreNames.contains(STORES.CHANNELS)) {
          const channelStore = db.createObjectStore(STORES.CHANNELS, { keyPath: 'id' });
          channelStore.createIndex('name', 'name', { unique: false });
          channelStore.createIndex('inviteCode', 'inviteCode', { unique: false });
        }

        // 创建消息表
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messageStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          messageStore.createIndex('channelId', 'channelId', { unique: false });
          messageStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 创建频道成员表
        if (!db.objectStoreNames.contains(STORES.CHANNEL_MEMBERS)) {
          const memberStore = db.createObjectStore(STORES.CHANNEL_MEMBERS, { keyPath: 'id' });
          memberStore.createIndex('channelId', 'channelId', { unique: false });
          memberStore.createIndex('userId', 'userId', { unique: false });
        }

        // 创建邀请码映射表
        if (!db.objectStoreNames.contains(STORES.INVITE_CODES)) {
          const inviteStore = db.createObjectStore(STORES.INVITE_CODES, { keyPath: 'code' });
        }

        console.log('Database schema created');
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 获取对象存储
   */
  private getObjectStore(storeName: string): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not opened');
    }
    const transaction = this.db.transaction(storeName, 'readwrite');
    return transaction.objectStore(storeName);
  }

  // ============ 用户操作 ============

  async createUser(user: User): Promise<User> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.USERS);
      const request = store.add(user);

      request.onsuccess = () => resolve(user);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.USERS);
      const index = store.index('username');
      const request = index.get(username);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.USERS);
      const index = store.index('email');
      const request = index.get(email);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.USERS);
      const index = store.index('username');
      const request = index.get(username);

      request.onsuccess = () => {
        const user = request.result;
        if (user && user.password === password) {
          resolve(user);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.USERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ 频道操作 ============

  async createChannel(channel: Channel): Promise<Channel> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHANNELS, STORES.INVITE_CODES], 'readwrite');

      // 添加频道
      const channelStore = transaction.objectStore(STORES.CHANNELS);
      const channelRequest = channelStore.add(channel);

      // 如果有邀请码，添加映射
      if (channel.inviteCode) {
        const inviteStore = transaction.objectStore(STORES.INVITE_CODES);
        const inviteData: InviteCode = {
          code: channel.inviteCode,
          channelId: channel.id,
          createdAt: new Date().toISOString(),
        };
        inviteStore.add(inviteData);
      }

      transaction.oncomplete = () => {
        console.log('Channel created:', channel);
        resolve(channel);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNELS);
      const request = store.get(channelId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getChannelByInviteCode(inviteCode: string): Promise<Channel | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.INVITE_CODES, STORES.CHANNELS], 'readonly');

      // 查找邀请码映射
      const inviteStore = transaction.objectStore(STORES.INVITE_CODES);
      const inviteRequest = inviteStore.get(inviteCode);

      inviteRequest.onsuccess = () => {
        const inviteData = inviteRequest.result as InviteCode | undefined;

        if (!inviteData) {
          resolve(null);
          return;
        }

        // 通过频道ID获取频道
        const channelStore = transaction.objectStore(STORES.CHANNELS);
        const channelRequest = channelStore.get(inviteData.channelId);

        channelRequest.onsuccess = () => resolve(channelRequest.result || null);
        channelRequest.onerror = () => reject(channelRequest.error);
      };

      inviteRequest.onerror = () => reject(inviteRequest.error);
    });
  }

  async getAllChannels(): Promise<Channel[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNELS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateChannel(channelId: string, updates: Partial<Channel>): Promise<Channel> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNELS);
      const getRequest = store.get(channelId);

      getRequest.onsuccess = () => {
        const channel = getRequest.result;
        if (!channel) {
          reject(new Error('Channel not found'));
          return;
        }

        const updatedChannel = { ...channel, ...updates, updatedAt: new Date().toISOString() };
        const putRequest = store.put(updatedChannel);

        putRequest.onsuccess = () => resolve(updatedChannel);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteChannel(channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CHANNELS, STORES.INVITE_CODES], 'readwrite');

      // 删除频道
      const channelStore = transaction.objectStore(STORES.CHANNELS);
      channelStore.delete(channelId);

      // 删除相关的邀请码映射
      const inviteStore = transaction.objectStore(STORES.INVITE_CODES);
      const inviteIndex = inviteStore.index('channelId');
      const inviteRequest = inviteIndex.openCursor(IDBKeyRange.only(channelId));

      inviteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ============ 消息操作 ============

  async addMessage(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.MESSAGES);
      const request = store.add(message);

      request.onsuccess = () => resolve(message);
      request.onerror = () => reject(request.error);
    });
  }

  async getChannelMessages(channelId: string, limit: number = 100): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.MESSAGES);
      const index = store.index('channelId');
      const request = index.getAll(channelId);

      request.onsuccess = () => {
        let messages = request.result || [];
        // 按时间排序并限制数量
        messages = messages.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        if (messages.length > limit) {
          messages = messages.slice(-limit);
        }
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ 频道成员操作 ============

  async addChannelMember(member: ChannelMember): Promise<ChannelMember> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNEL_MEMBERS);
      const request = store.add(member);

      request.onsuccess = () => resolve(member);
      request.onerror = () => reject(request.error);
    });
  }

  async getChannelMembers(channelId: string): Promise<ChannelMember[]> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNEL_MEMBERS);
      const index = store.index('channelId');
      const request = index.getAll(channelId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateChannelMember(
    memberId: string,
    updates: Partial<ChannelMember>
  ): Promise<ChannelMember> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNEL_MEMBERS);
      const getRequest = store.get(memberId);

      getRequest.onsuccess = () => {
        const member = getRequest.result;
        if (!member) {
          reject(new Error('Member not found'));
          return;
        }

        const updatedMember = { ...member, ...updates };
        const putRequest = store.put(updatedMember);

        putRequest.onsuccess = () => resolve(updatedMember);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async removeChannelMember(memberId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getObjectStore(STORES.CHANNEL_MEMBERS);
      const request = store.delete(memberId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        Object.values(STORES),
        'readwrite'
      );

      transaction.onerror = () => reject(transaction.error);

      transaction.oncomplete = () => {
        console.log('All data cleared');
        resolve();
      };

      // 删除所有对象存储中的数据
      Object.values(STORES).forEach(storeName => {
        const store = transaction.objectStore(storeName);
        store.clear();
      });
    });
  }
}

// 单例实例
let dbInstance: Database | null = null;

/**
 * 获取数据库实例
 */
export async function getDB(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = new Database();
    await dbInstance.open();
  }
  return dbInstance;
}

/**
 * 初始化数据库
 */
export async function initDB(): Promise<void> {
  const db = await getDB();

  // 迁移 localStorage 数据到 IndexedDB
  await migrateFromLocalStorage();
}

/**
 * 从 localStorage 迁移数据到 IndexedDB
 */
async function migrateFromLocalStorage(): Promise<void> {
  try {
    // 迁移用户数据
    const usersData = localStorage.getItem('quickchat_users');
    if (usersData) {
      const users = JSON.parse(usersData);
      const db = await getDB();

      for (const user of users) {
        try {
          await db.createUser(user);
        } catch (err) {
          // 用户可能已存在，忽略
        }
      }

      localStorage.removeItem('quickchat_users');
    }

    // 迁移频道数据
    const channelsData = localStorage.getItem('quickchat_channels');
    if (channelsData) {
      const channels = JSON.parse(channelsData);
      const db = await getDB();

      for (const channel of channels) {
        try {
          await db.createChannel(channel);
        } catch (err) {
          // 频道可能已存在，忽略
        }
      }

      localStorage.removeItem('quickchat_channels');
    }

    // 迁移邀请码映射
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('channel_invite_')) {
        const channelId = localStorage.getItem(key);
        const inviteCode = key.replace('channel_invite_', '');

        if (channelId && inviteCode) {
          const db = await getDB();
          const transaction = db.db!.transaction([STORES.INVITE_CODES], 'readwrite');
          const inviteStore = transaction.objectStore(STORES.INVITE_CODES);

          inviteStore.add({
            code: inviteCode,
            channelId: channelId,
            createdAt: new Date().toISOString(),
          });
        }

        localStorage.removeItem(key);
      }
    }

    // 迁移消息数据
    const messagesData = localStorage.getItem('quickchat_messages');
    if (messagesData) {
      const messages = JSON.parse(messagesData);
      const db = await getDB();

      for (const message of messages) {
        try {
          await db.addMessage(message);
        } catch (err) {
          // 消息可能已存在，忽略
        }
      }

      localStorage.removeItem('quickchat_messages');
    }

    console.log('Migration from localStorage completed');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

export { Database };
