import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * 消息确认服务
 * 实现 Telegram 风格的消息确认机制
 */
@Injectable()
export class MessageAckService {
  private readonly logger = new Logger(MessageAckService.name);
  private pendingMessages = new Map<string, Set<string>>(); // channelId -> Set of messageIds
  private messageRecipients = new Map<string, Set<string>>(); // messageId -> Set of userIds

  /**
   * 标记消息为待确认
   */
  markPending(channelId: string, messageId: string) {
    if (!this.pendingMessages.has(channelId)) {
      this.pendingMessages.set(channelId, new Set());
    }
    this.pendingMessages.get(channelId)!.add(messageId);
    this.logger.debug(`Message ${messageId} marked as pending for channel ${channelId}`);
  }

  /**
   * 确认消息已送达
   */
  acknowledgeMessage(messageId: string, userId: string) {
    if (!this.messageRecipients.has(messageId)) {
      this.messageRecipients.set(messageId, new Set());
    }
    this.messageRecipients.get(messageId)!.add(userId);

    const recipients = this.messageRecipients.get(messageId)!;
    this.logger.debug(`Message ${messageId} acknowledged by ${userId} (${recipients.size} total)`);
  }

  /**
   * 获取消息的确认状态
   */
  getMessageStatus(messageId: string): { delivered: boolean; recipientCount: number } {
    const recipients = this.messageRecipients.get(messageId);
    return {
      delivered: recipients ? recipients.size > 0 : false,
      recipientCount: recipients ? recipients.size : 0,
    };
  }

  /**
   * 清理已确认的消息
   */
  cleanup(channelId: string) {
    const pending = this.pendingMessages.get(channelId);
    if (pending) {
      pending.forEach(messageId => {
        this.messageRecipients.delete(messageId);
      });
      this.pendingMessages.delete(channelId);
      this.logger.debug(`Cleaned up messages for channel ${channelId}`);
    }
  }
}
