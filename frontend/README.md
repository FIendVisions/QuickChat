# QuickChat 前端

QuickChat 游戏语音开黑系统的前端应用。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **实时通信**: Socket.io Client
- **HTTP 客户端**: Axios
- **图标**: Lucide React
- **日期处理**: date-fns

## 功能特性

### ✅ 已实现

- Discord 风格深色主题
- 频道列表（公共/私有分组）
- 创建频道（支持类型选择、密码设置）
- 公共频道文本聊天
- 私有频道语音房间
- 参与者网格展示
- 语音控制栏（麦克风、耳机）
- 成员列表
- 实时状态更新
- 说话状态指示器
- 音量可视化

### 🚧 开发中

- 步骤 6: Speaking Indicator 逻辑完善
- 步骤 7: 创建频道、退出频道、权限控制完善

## 安装

```bash
cd frontend
npm install
```

## 配置

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 开发

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

## 构建

```bash
npm run build
npm start
```

## 项目结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   └── globals.css         # 全局样式
│   │
│   ├── components/             # 组件
│   │   ├── channel/            # 频道组件
│   │   │   ├── ChannelList.tsx
│   │   │   ├── ChannelItem.tsx
│   │   │   ├── PublicChannelView.tsx
│   │   │   ├── PrivateChannelView.tsx
│   │   │   └── CreateChannelModal.tsx
│   │   ├── voice/              # 语音组件
│   │   │   ├── VoiceRoom.tsx
│   │   │   ├── VoiceControls.tsx
│   │   │   ├── ParticipantCard.tsx
│   │   │   ├── SpeakingIndicator.tsx
│   │   │   └── VolumeMeter.tsx
│   │   ├── message/            # 消息组件
│   │   │   ├── MessageList.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── member/             # 成员组件
│   │   │   ├── MemberList.tsx
│   │   │   └── MemberItem.tsx
│   │   └── layout/             # 布局组件
│   │       ├── TopBar.tsx
│   │       ├── LeftSidebar.tsx
│   │       └── StatusBar.tsx
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── useChannel.ts       # 频道 Hook
│   │   ├── useVoice.ts         # 语音 Hook
│   │   ├── useWebSocket.ts     # WebSocket Hook
│   │   └── useAuth.ts          # 认证 Hook
│   │
│   ├── store/                  # 状态管理 (Zustand)
│   │   ├── channelStore.ts
│   │   └── voiceStore.ts
│   │
│   ├── services/               # 服务层
│   │   ├── api/
│   │   │   ├── http.ts         # HTTP 客户端
│   │   │   └── channel.api.ts  # 频道 API
│   │   └── websocket/
│   │       └── socket.service.ts
│   │
│   ├── types/                  # 类型定义
│   │   ├── channel.types.ts
│   │   ├── user.types.ts
│   │   └── voice.types.ts
│   │
│   └── utils/                  # 工具函数
│       └── constants.ts
│
├── public/                     # 静态资源
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── postcss.config.js
```

## 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏 (Logo | 搜索 | 用户)                             │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  左侧   │         主内容区                                   │
│  导航   │         (频道列表 / 语音房间 / 聊天)                │
│         │                                                   │
│ - 频道  │                                                   │
│ - + 创建│                                                   │
│         │                                                   │
│ 用户   │                                                   │
│ 面板   │                                                   │
└──────────┴──────────────────────────────────────────────────┘
│  底部状态栏 (连接状态 | Ping | 版本)                        │
└─────────────────────────────────────────────────────────────┘
```

## 组件说明

### 频道组件

#### ChannelList
频道列表组件，按类型分组展示公共和私有频道。

#### ChannelItem
单个频道项，显示频道名称、图标、人数等信息。

#### PublicChannelView
公共频道视图，仅支持文本聊天。

#### PrivateChannelView
私有频道视图，支持语音聊天和文本消息。

#### CreateChannelModal
创建频道模态框，支持设置名称、类型、密码等。

### 语音组件

#### VoiceRoom
语音房间主界面，以网格形式展示所有参与者。

#### VoiceControls
语音控制栏，提供麦克风、耳机、屏幕共享等控制按钮。

#### ParticipantCard
参与者卡片，显示用户头像、名称和语音状态。

#### SpeakingIndicator
说话状态指示器，使用声波动画展示。

#### VolumeMeter
音量条组件，可视化显示音频音量。

### 消息组件

#### MessageList
消息列表组件，支持加载历史消息和滚动加载。

#### MessageInput
消息输入框，支持发送文本消息。

### 成员组件

#### MemberList
成员列表，显示频道内的所有成员。

#### MemberItem
单个成员项，显示用户信息和在线状态。

## WebSocket 事件

### 客户端发送

| 事件 | 参数 | 描述 |
|------|------|------|
| `join_voice_channel` | `{ channelId, rtpCapabilities }` | 加入语音频道 |
| `leave_voice_channel` | `{ channelId }` | 退出语音频道 |
| `microphone_state_change` | `{ isMuted }` | 麦克风状态变化 |
| `speaking_state_change` | `{ isSpeaking, volume }` | 说话状态变化 |

### 服务器推送

| 事件 | 参数 | 描述 |
|------|------|------|
| `connected` | `{ userId, timestamp }` | 连接成功 |
| `user_joined` | `{ userId, channelId, timestamp }` | 用户加入 |
| `user_left` | `{ userId, channelId, timestamp }` | 用户离开 |
| `user_speaking_state_changed` | `{ userId, isSpeaking, volume }` | 说话状态变化 |
| `user_microphone_state_changed` | `{ userId, isMuted }` | 麦克风状态变化 |

## 样式说明

使用 Tailwind CSS 构建，采用 Discord 风格的深色主题。

### 颜色变量

```css
--primary: #5865f2;       /* 主品牌色 */
--bg-primary: #36393f;    /* 主背景 */
--bg-secondary: #2f3136;  /* 次级背景 */
--bg-tertiary: #202225;   /* 三级背景 */
--text-normal: #dcddde;   /* 普通文字 */
--text-muted: #72767d;    /* 弱化文字 */
--success: #3ba55c;       /* 成功/在线 */
--danger: #ed4245;        /* 危险/离线 */
```

## 状态管理

使用 Zustand 管理全局状态：

- `channelStore`: 频道列表、选中状态、加载状态
- `voiceStore`: 连接状态、参与者、说话状态

## 注意事项

1. **公共频道禁止语音**: 公共频道的 `canSpeak` 为 `false`，不显示语音控制
2. **私有频道支持语音**: 私有频道自动加入语音房间
3. **说话状态同步**: 通过 WebSocket 实时同步用户的说话状态
4. **自动滚动**: 新消息时自动滚动到底部
5. **连接重试**: WebSocket 断线自动重连

## 下一步

- 步骤 6: 完善 Speaking Indicator 逻辑
- 步骤 7: 完善权限控制和频道管理

## 许可证

MIT
