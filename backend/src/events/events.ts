// backend/src/events/events.ts

/**
 * WebSocket 事件类型定义
 */

// 频道相关事件
export class ChannelCreatedEvent {
  constructor(
    public readonly channel: any,
  ) {}
}

export class ChannelUpdatedEvent {
  constructor(
    public readonly channelId: string,
    public readonly updates: any,
  ) {}
}

export class ChannelDeletedEvent {
  constructor(
    public readonly channelId: string,
  ) {}
}

// 消息相关事件
export class MessageSentEvent {
  constructor(
    public readonly channelId: string,
    public readonly message: any,
  ) {}
}

// 成员相关事件
export class MemberJoinedEvent {
  constructor(
    public readonly channelId: string,
    public readonly member: any,
  ) {}
}

export class MemberLeftEvent {
  constructor(
    public readonly channelId: string,
    public readonly userId: string,
  ) {}
}

// 用户状态事件
export class UserStatusEvent {
  constructor(
    public readonly userId: string,
    public readonly status: string,
  ) {}
}
