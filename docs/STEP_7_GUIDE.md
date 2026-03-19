# 步骤 7：频道管理功能 - 使用指南

## 概述

步骤 7 实现了完整的频道生命周期管理，包括创建、加入、退出频道，以及频道设置和权限控制。

---

## 已实现功能

### 1. 创建频道

**组件:** `CreateChannelModal.tsx`

**功能特性:**
- ✅ 公开频道 vs 私密频道选择
- ✅ 频道名称输入（最多 32 字符）
- ✅ 可选描述（最多 100 字符）
- ✅ 私密频道密码设置（最少 4 字符）
- ✅ 实时字符计数
- ✅ 表单验证
- ✅ 错误提示

**使用方式:**
```tsx
<CreateChannelModal
  onClose={() => setShowModal(false)}
  onCreate={async (data) => {
    await createChannel(data);
    // 处理成功
  }}
/>
```

**数据结构:**
```typescript
interface CreateChannelData {
  name: string;          // 频道名称
  type: 'public' | 'private';
  description?: string;  // 可选
  password?: string;     // 私密频道必填
}
```

---

### 2. 密码保护频道

**组件:** `PasswordPromptModal.tsx`

**功能特性:**
- ✅ 加入私密频道时弹出密码输入
- ✅ 密码验证失败显示错误
- ✅ 美观的锁图标提示
- ✅ 支持取消操作

**使用方式:**
```tsx
<PasswordPromptModal
  channelName="开黑语音"
  onClose={() => setShowModal(false)}
  onSubmit={async (password) => {
    await joinChannel(channelId, password);
  }}
/>
```

---

### 3. 频道管理 Hook

**Hook:** `useChannelManagement.ts`

**核心功能:**
- ✅ 创建频道
- ✅ 加入频道（带密码）
- ✅ 退出频道
- ✅ 删除频道（所有者）
- ✅ 超时处理（10秒）
- ✅ 错误处理

**使用示例:**
```tsx
const {
  isCreating,
  isJoining,
  isLeaving,
  error,
  createChannel,
  joinChannel,
  leaveChannel,
  deleteChannel,
} = useChannelManagement({
  userId: 'user-123',
  token: 'jwt-token',
  onCreateSuccess: (channelId) => {
    console.log('Created:', channelId);
  },
  onJoinSuccess: (channelId) => {
    console.log('Joined:', channelId);
  },
  onLeaveSuccess: () => {
    router.push('/channels');
  },
});

// 创建频道
await createChannel({
  name: '开黑语音',
  type: 'private',
  password: '1234',
});

// 加入私密频道
await joinChannel('channel-id', '1234');

// 退出频道
await leaveChannel();

// 删除频道（所有者）
await deleteChannel('channel-id');
```

---

### 4. 频道列表集成

**更新:** `ChannelList.tsx`

**新增功能:**
- ✅ "创建频道" 按钮
- ✅ 公开频道直接加入
- ✅ 私密频道弹出密码输入
- ✅ 创建/加入后自动刷新

**工作流程:**
1. 用户点击 "创建频道" 按钮
2. 弹出 CreateChannelModal
3. 填写信息并提交
4. 成功后刷新页面显示新频道
5. 点击私密频道 → 弹出密码输入
6. 输入正确密码 → 加入频道

---

### 5. 退出频道

**更新:** `PrivateChannelView.tsx`

**实现逻辑:**
```typescript
const handleLeave = async () => {
  try {
    // 1. 离开语音房间（关闭麦克风）
    voiceLeaveChannel();

    // 2. 离开 API 频道（通知服务器）
    await apiLeaveChannel();

    // 3. 跳转回频道列表
    router.push('/channels');
  } catch (error) {
    console.error('Failed to leave:', error);
    // 即使失败也跳转
    router.push('/channels');
  }
};
```

**UI 位置:** `VoiceControlsEnhanced` 组件的 "断开" 按钮

---

### 6. 频道设置

**组件:** `ChannelSettingsModal.tsx`

**功能特性:**
- ✅ 显示频道信息（类型、描述）
- ✅ 修改密码（私密频道，所有者）
- ✅ 删除频道（所有者）
- ✅ 二次确认删除
- ✅ 权限控制（仅所有者可操作）

**所有者权限:**
- 修改私密频道密码
- 删除频道（永久删除，不可恢复）

**使用示例:**
```tsx
<ChannelSettingsModal
  channel={channel}
  isOwner={channel.ownerId === userId}
  onClose={() => setShowSettings(false)}
  onDelete={async (channelId) => {
    await deleteChannel(channelId);
    router.push('/channels');
  }}
  onUpdatePassword={async (channelId, newPassword) => {
    await updateChannelPassword(channelId, newPassword);
  }}
/>
```

---

## WebSocket 事件

### 客户端发送

```typescript
// 创建频道
socket.emit('create_channel', {
  name: '频道名',
  type: 'public' | 'private',
  description?: string,
  password?: string,
});

// 加入频道
socket.emit('join_channel', {
  channelId: 'channel-id',
  password?: string,  // 私密频道需要
});

// 退出频道
socket.emit('leave_channel', {
  channelId: 'channel-id',
});

// 删除频道
socket.emit('delete_channel', {
  channelId: 'channel-id',
});

// 修改密码
socket.emit('update_channel_password', {
  channelId: 'channel-id',
  newPassword: '新密码',
});
```

### 服务器响应

```typescript
// 成功事件
socket.on('channel_created', ({ channelId }) => {});
socket.on('channel_joined', () => {});
socket.on('channel_left', () => {});
socket.on('channel_deleted', () => {});
socket.on('channel_password_updated', () => {});

// 错误事件
socket.on('channel_create_error', ({ message }) => {});
socket.on('channel_join_error', ({ message }) => {});
socket.on('channel_leave_error', ({ message }) => {});
socket.on('channel_delete_error', ({ message }) => {});
```

---

## 权限系统

### 频道类型权限

| 操作 | 公开频道 | 私密频道 |
|------|---------|---------|
| 查看频道 | ✅ 所有人 | ✅ 所有人 |
| 加入频道 | ✅ 所有人 | ✅ 需要密码 |
| 文字聊天 | ✅ 是 | ✅ 是 |
| 语音聊天 | ❌ 否 | ✅ 是 |
| 删除频道 | ✅ 仅创建者 | ✅ 仅创建者 |
| 修改密码 | ❌ 无密码 | ✅ 仅创建者 |

### 所有者标识

```typescript
interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  ownerId: string;  // 创建者 ID
  // ...
}

// 检查是否是所有者
const isOwner = channel.ownerId === userId;
```

---

## 错误处理

### 常见错误场景

1. **创建频道失败**
   - 频道名称为空
   - 名称超过 32 字符
   - 密码少于 4 字符（私密频道）
   - 网络超时（10秒）

2. **加入频道失败**
   - 密码错误
   - 频道不存在
   - 网络超时（10秒）

3. **退出频道失败**
   - 未加入任何频道
   - 网络超时（5秒）

4. **删除频道失败**
   - 不是频道所有者
   - 频道不存在
   - 网络超时（10秒）

### 错误提示

所有错误都会显示在模态框中，使用红色警告样式：

```tsx
{error && (
  <div className="p-3 bg-danger/10 border border-danger/50 rounded-md">
    <p className="text-sm text-danger">{error}</p>
  </div>
)}
```

---

## 最佳实践

### 1. 频道创建流程

```tsx
// 推荐：创建后自动加入
const handleCreate = async (data) => {
  const channelId = await createChannel(data);
  await joinChannel(channelId);
  // 跳转到频道视图
  router.push(`/channels/${channelId}`);
};
```

### 2. 频道退出清理

```tsx
// 推荐：完整清理
const handleLeave = async () => {
  // 1. 关闭麦克风
  await closeMicrophone();

  // 2. 离开语音房间
  await leaveVoiceChannel();

  // 3. 通知服务器
  await apiLeaveChannel();

  // 4. 清理本地状态
  clearLocalState();

  // 5. 跳转
  router.push('/channels');
};
```

### 3. 密码验证

```tsx
// 推荐：后端验证
// 不要仅依赖前端验证
if (password.length < 4) {
  throw new Error('密码至少需要 4 个字符');
}

// 后端也必须验证
@UseGuards(JwtGuard)
async joinChannel(@Body() dto: JoinChannelDto) {
  // 验证密码
  const isValid = await bcrypt.compare(dto.password, channel.password);
  if (!isValid) {
    throw new ForbiddenException('密码错误');
  }
}
```

---

## 下一步

步骤 7 已完成，可以继续优化：

1. **频道邀请系统** - 生成邀请链接
2. **频道角色系统** - 管理员、版主等角色
3. **频道公告** - 重要通知
4. **频道限制** - 人数限制、等级限制
5. **频道封禁** - 封禁用户

---

## 文件清单

```
frontend/src/
├── components/
│   └── channel/
│       ├── CreateChannelModal.tsx          [新增]
│       ├── PasswordPromptModal.tsx         [新增]
│       ├── ChannelSettingsModal.tsx        [新增]
│       ├── ChannelList.tsx                 [更新]
│       └── PrivateChannelView.tsx          [更新]
├── hooks/
│   └── useChannelManagement.ts             [新增]
└── types/
    └── channel.types.ts                    [引用]
```

---

## 测试清单

- [ ] 创建公开频道
- [ ] 创建私密频道（有密码）
- [ ] 加入公开频道
- [ ] 加入私密频道（正确密码）
- [ ] 加入私密频道（错误密码）
- [ ] 退出频道
- [ ] 删除频道（所有者）
- [ ] 删除频道（非所有者，应失败）
- [ ] 修改频道密码
- [ ] 网络超时处理
- [ ] 并发创建/加入频道
