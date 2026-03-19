// frontend/src/utils/constants.ts

/**
 * 应用配置常量
 */
export const APP_CONFIG = {
  // API 配置
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',

  // WebSocket 配置
  WS_RECONNECT_DELAY: 1000,
  WS_RECONNECT_ATTEMPTS: 5,
  WS_HEARTBEAT_INTERVAL: 15000,

  // 频道配置
  MAX_CHANNEL_NAME_LENGTH: 50,
  MAX_CHANNEL_DESCRIPTION_LENGTH: 500,
  MAX_CHANNEL_PASSWORD_LENGTH: 100,
  MAX_PRIVATE_CHANNEL_PARTICIPANTS: 50,

  // 消息配置
  MAX_MESSAGE_LENGTH: 2000,
  MESSAGES_PAGE_SIZE: 50,

  // 语音配置
  SPEAKING_THRESHOLD: -30, // dB
  SPEAKING_DEBOUNCE: 200, // ms
  SPEAKING_SILENCE_DELAY: 500, // ms

  // UI 配置
  TOAST_AUTO_CLOSE_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 150,

  // 用户状态
  ONLINE_TIMEOUT: 5 * 60 * 1000, // 5分钟
  IDLE_TIMEOUT: 10 * 60 * 1000, // 10分钟
} as const;

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  USERNAME: 'username',
  THEME: 'theme',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * 事件名称
 */
export const EVENTS = {
  // WebSocket
  WS_CONNECT: 'ws:connect',
  WS_DISCONNECT: 'ws:disconnect',
  WS_ERROR: 'ws:error',

  // 频道
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',

  // 消息
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',

  // 语音
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_SPEAKING_START: 'voice:speaking_start',
  VOICE_SPEAKING_END: 'voice:speaking_end',
  VOICE_MICROPHONE_TOGGLE: 'voice:microphone_toggle',
} as const;

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  AUTH_FAILED: '登录已过期，请重新登录',
  PERMISSION_DENIED: '权限不足',
  CHANNEL_NOT_FOUND: '频道不存在',
  CHANNEL_FULL: '频道已满',
  INVALID_PASSWORD: '密码错误',
  ALREADY_IN_CHANNEL: '你已在频道中',
  NOT_IN_CHANNEL: '你不在频道中',
  MICROPHONE_PERMISSION_DENIED: '需要麦克风权限才能使用语音功能',
} as const;

/**
 * 成功消息
 */
export const SUCCESS_MESSAGES = {
  CHANNEL_CREATED: '频道创建成功',
  CHANNEL_UPDATED: '频道更新成功',
  CHANNEL_DELETED: '频道删除成功',
  CHANNEL_JOINED: '成功加入频道',
  CHANNEL_LEFT: '成功退出频道',
  MESSAGE_SENT: '消息发送成功',
} as const;
