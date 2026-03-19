/**
 * 消息同步管理器
 * 参考 Telegram/Discord 的消息同步机制
 */

export interface Message {
  id: string;
  seq: number;
  channelId: string;
  userId: string;
  username: string;
  avatar?: string | null;
  content: string;
  type: 'TEXT' | 'SYSTEM' | 'EMOJI';
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
}

export interface PendingMessage {
  tempId: string;
  channelId: string;
  content: string;
  userId: string;
  username: string;
  timestamp: number;
  retryCount: number;
}

export class MessageSyncManager {
  private messageQueues = new Map<string, Message[]>(); // channelId -> messages
  private pendingMessages = new Map<string, PendingMessage>(); // tempId -> pending message
  private processedMessageIds = new Set<string>();
  private channelSequenceNumbers = new Map<string, number>(); // channelId -> last sequence
  private messageCallbacks = new Set<(channelId: string, message: Message) => void>();

  /**
   * 添加消息到队列（带去重和排序）
   */
  addMessageToQueue(channelId: string, message: Message): Message[] {
    // 使用频道ID + 消息ID作为唯一标识，避免跨频道冲突
    const uniqueKey = `${channelId}:${message.id}`;

    // 检查是否已处理（使用频道特定的唯一键）
    if (this.processedMessageIds.has(uniqueKey)) {
      console.log(`⚠️ [Sync] Message ${message.id} (channel: ${channelId}) already processed, skipping`);
      return this.getMessages(channelId);
    }

    // 标记为已处理（使用频道特定的唯一键）
    this.processedMessageIds.add(uniqueKey);

    // 获取或创建消息队列
    if (!this.messageQueues.has(channelId)) {
      this.messageQueues.set(channelId, []);
    }

    const queue = this.messageQueues.get(channelId)!;

    // 检查是否已存在（防御性编程）
    const exists = queue.some(m => m.id === message.id);
    if (exists) {
      console.log(`⚠️ [Sync] Message ${message.id} exists in queue (channel: ${channelId}), skipping`);
      return queue;
    }

    // 添加到队列
    queue.push(message);

    // 按序列号排序
    queue.sort((a, b) => a.seq - b.seq);

    // 更新频道序列号
    this.channelSequenceNumbers.set(channelId, message.seq);

    console.log(`✅ [Sync] Message ${message.id} (seq: ${message.seq}, channel: ${channelId}) added. Queue size: ${queue.length}`);

    // 通知回调
    this.messageCallbacks.forEach(callback => {
      try {
        callback(channelId, message);
      } catch (error) {
        console.error(`❌ [Sync] Error in message callback:`, error);
      }
    });

    return queue;
  }

  /**
   * 批量添加消息（用于历史消息加载）
   */
  addMessages(channelId: string, messages: Message[]): Message[] {
    if (!this.messageQueues.has(channelId)) {
      this.messageQueues.set(channelId, []);
    }

    const queue = this.messageQueues.get(channelId)!;

    messages.forEach(message => {
      const uniqueKey = `${channelId}:${message.id}`;
      if (!this.processedMessageIds.has(uniqueKey)) {
        this.processedMessageIds.add(uniqueKey);
        queue.push(message);
      }
    });

    // 按序列号排序
    queue.sort((a, b) => a.seq - b.seq);

    // 更新最大序列号
    if (messages.length > 0) {
      const maxSeq = Math.max(...messages.map(m => m.seq));
      this.channelSequenceNumbers.set(channelId, maxSeq);
    }

    console.log(`✅ [Sync] Batch added ${messages.length} messages to channel ${channelId}. Queue size: ${queue.length}`);

    return queue;
  }

  /**
   * 获取频道的消息队列
   */
  getMessages(channelId: string): Message[] {
    return this.messageQueues.get(channelId) || [];
  }

  /**
   * 清空频道的消息队列
   */
  clearChannel(channelId: string) {
    this.messageQueues.delete(channelId);
    this.channelSequenceNumbers.delete(channelId);
    console.log(`🧹 [Sync] Cleared messages for channel ${channelId}`);
  }

  /**
   * 获取频道的最后序列号
   */
  getLastSequence(channelId: string): number {
    return this.channelSequenceNumbers.get(channelId) || 0;
  }

  /**
   * 检查是否缺失消息
   */
  hasGap(channelId: string, fromSeq: number, toSeq: number): boolean {
    const messages = this.getMessages(channelId);
    const sequences = new Set(messages.map(m => m.seq));

    for (let seq = fromSeq; seq <= toSeq; seq++) {
      if (!sequences.has(seq)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 添加待发送消息
   */
  addPendingMessage(tempId: string, message: PendingMessage) {
    this.pendingMessages.set(tempId, message);
    console.log(`📤 [Sync] Pending message ${tempId} added`);
  }

  /**
   * 移除待发送消息
   */
  removePendingMessage(tempId: string): PendingMessage | undefined {
    const message = this.pendingMessages.get(tempId);
    this.pendingMessages.delete(tempId);
    return message;
  }

  /**
   * 用真实消息替换临时消息
   */
  replacePendingMessage(tempId: string, realMessage: Message): Message[] | undefined {
    const pending = this.pendingMessages.get(tempId);
    if (!pending) {
      console.warn(`⚠️ [Sync] No pending message found for tempId ${tempId}`);
      return undefined;
    }

    const channelId = pending.channelId;
    const queue = this.getMessages(channelId);

    // 查找并替换临时消息
    const index = queue.findIndex(m => m.id === tempId);
    if (index !== -1) {
      queue[index] = realMessage;
      console.log(`🔄 [Sync] Replaced temp message ${tempId} with real message ${realMessage.id}`);
    }

    // 从待发送队列中移除
    this.pendingMessages.delete(tempId);

    return queue;
  }

  /**
   * 注册消息回调
   */
  onMessage(callback: (channelId: string, message: Message) => void) {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalMessages: Array.from(this.messageQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      processedIds: this.processedMessageIds.size,
      pendingMessages: this.pendingMessages.size,
      channels: this.messageQueues.size,
    };
  }
}

// 单例实例
let instance: MessageSyncManager | null = null;

export function getMessageSyncManager(): MessageSyncManager {
  if (!instance) {
    instance = new MessageSyncManager();
  }
  return instance;
}
