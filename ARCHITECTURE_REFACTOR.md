# 实时消息架构重构指南

## 📋 概述

这次重构参考了 Telegram 和 Discord 的消息同步机制，解决了消息偶尔不同步的问题。

## 🎯 核心改进

### 1. **消息序列号（Sequence Number）**
- 每条消息都有唯一的递增序列号
- 用于排序和增量同步
- 检测缺失消息

### 2. **消息确认机制（ACK）**
- 发送方知道消息是否被送达
- 支持消息状态追踪（SENT → DELIVERED → READ）

### 3. **消息同步管理器**
- 统一管理所有消息状态
- 自动去重和排序
- 支持增量同步

### 4. **改进的 WebSocket Gateway**
- 更好的房间管理
- 连接状态追踪
- 详细的调试日志

## 📁 新增文件

### 后端

```
backend/src/
├── message-queue/
│   ├── message-ack.service.ts        # 消息确认服务
│   ├── sequence-generator.service.ts # 序列号生成器
│   └── message-queue.module.ts       # 模块导出
├── gateway/
│   └── websocket.gateway.v2.ts       # 改进版 Gateway（未激活）
└── database/prisma/schema.prisma     # 添加了 sequence 和 status 字段
```

### 前端

```
frontend/src/
├── services/messageSync/
│   └── MessageSyncManager.ts         # 消息同步管理器
├── contexts/
│   └── WebSocketContext.v2.tsx       # 改进版 WebSocket Context（未激活）
└── components/message/
    └── MessageList.v2.tsx            # 改进版 MessageList（未激活）
```

## 🔄 数据库变更

### Message 模型新增字段

```prisma
model Message {
  // ... 原有字段
  sequence  Int      @default(0)  // 新增：序列号
  status    String   @default("SENT") // 新增：消息状态
  // ...
}
```

### 迁移已执行

```bash
✅ Migration: 20260318210553_add_message_sequence
✅ Database updated
```

## 🚀 集成新架构

### 步骤1：使用新的 MessageSyncManager

在任何组件中使用消息同步管理器：

```typescript
import { getMessageSyncManager, Message } from '@/services/messageSync/MessageSyncManager';

function MyComponent() {
  const messageSync = getMessageSyncManager();

  // 添加消息
  messageSync.addMessageToQueue(channelId, message);

  // 获取消息
  const messages = messageSync.getMessages(channelId);

  // 监听新消息
  useEffect(() => {
    const unsubscribe = messageSync.onMessage((channelId, message) => {
      console.log('New message:', message);
    });
    return unsubscribe;
  }, []);
}
```

### 步骤2：替换 MessageList（可选）

在 `page.tsx` 中：

```typescript
// 旧版本
import { MessageList } from '@/components/message/MessageList';

// 新版本
import { MessageListV2 } from '@/components/message/MessageList.v2';

// 使用
<MessageListV2 channelId={selectedChannel.id} userId={user.id} />
```

### 步骤3：使用新的 WebSocket Context（可选）

在 `page.tsx` 中：

```typescript
// 旧版本
import { WebSocketProvider } from '@/contexts/WebSocketContext';

// 新版本
import { WebSocketProviderV2 } from '@/contexts/WebSocketContext.v2';

// 使用
<WebSocketProviderV2 userId={user.id} token={token}>
  {/* ... */}
</WebSocketProviderV2>
```

## 🔧 当前状态

### ✅ 已完成
- [x] 数据库 schema 更新（添加 sequence, status）
- [x] 后端消息序列号生成
- [x] 消息确认服务
- [x] 前端消息同步管理器
- [x] 改进的 WebSocket Gateway
- [x] 改进的 MessageList 组件

### ⏳ 待完成
- [ ] 替换旧的 WebSocketProvider 为 V2 版本
- [ ] 替换旧的 MessageList 为 V2 版本
- [ ] 更新 messageApi.getMessages 以返回序列号
- [ ] 实现消息重试机制
- [ ] 实现消息已读回执
- [ ] 添加离线消息队列

## 🧪 测试步骤

### 1. 验证后端序列号生成

```bash
curl -X POST http://localhost:3001/channels/{channelId}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "测试消息",
    "userId": "xxx",
    "username": "test"
  }'
```

应该返回：
```json
{
  "id": "xxx",
  "sequence": 1,
  "status": "SENT",
  ...
}
```

### 2. 验证前端消息同步

打开浏览器控制台，应该看到：
```
✅ [Sync] Message xxx (seq: 1) added to channel xxx
```

### 3. 多窗口测试

1. 打开两个浏览器窗口
2. 登录不同用户
3. 进入同一频道
4. 发送消息
5. 检查是否实时同步

## 📊 性能改进

### 消息去重
- 使用 Set 跟踪已处理消息
- 避免重复显示

### 增量同步
- 基于序列号增量获取
- 减少数据传输

### 状态管理优化
- 单例模式减少内存占用
- 统一的消息队列

## 🐛 故障排除

### 问题：序列号不递增

**原因：**数据库迁移未执行

**解决：**
```bash
cd backend
npx prisma migrate dev --schema src/database/prisma/schema.prisma
```

### 问题：消息仍然不同步

**检查项：**
1. 后端日志是否有 `[BROADCAST]` 日志
2. 前端控制台是否有 `🔥🔥🔥 [WebSocket] Received message:new` 日志
3. 检查房间成员数量

### 问题：临时消息没有被替换

**检查项：**
1. WebSocket 是否收到真实消息
2. MessageSyncManager 是否正确调用 replacePendingMessage
3. 检查消息 ID 匹配

## 📖 参考资料

### Telegram 消息同步机制
- 每条消息有唯一 ID 和序列号
- 客户端维护本地消息队列
- 增量同步基于序列号

### Discord 消息同步机制
- 使用 Snowflake ID
- 事件排序和去重
- 心跳检测和重连

## 🎯 下一步计划

1. **完全迁移到新架构**
   - 替换所有旧组件
   - 更新所有 API 调用

2. **实现消息重试机制**
   - 失败消息自动重发
   - 指数退避策略

3. **实现消息已读回执**
   - 跟踪消息已读状态
   - 显示"已读"标记

4. **性能优化**
   - 消息分页加载
   - 虚拟滚动
   - 图片懒加载

## 💡 最佳实践

### 发送消息

```typescript
// ✅ 推荐：使用消息同步管理器
const messageSync = getMessageSyncManager();
const tempId = `temp-${Date.now()}`;

// 1. 添加临时消息
messageSync.addPendingMessage(tempId, { ... });

// 2. 发送到服务器
await sendMessage(content);

// 3. 服务器广播后会自动替换
```

### 监听消息

```typescript
// ✅ 推荐：使用消息同步管理器回调
useEffect(() => {
  const unsubscribe = messageSync.onMessage((channelId, message) => {
    if (channelId === currentChannel) {
      // 更新 UI
    }
  });
  return unsubscribe;
}, []);
```

---

**注意：** 新架构（V2 版本）目前是可选的。旧的组件仍然可以正常工作。建议逐步迁移以获得更好的稳定性和性能。
