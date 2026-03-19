# QuickChat - 游戏语音开黑系统

类似 Discord 的游戏语音开黑系统，支持公共频道文本聊天和私有频道实时语音。

## 🎯 项目进度

- [x] 步骤 1: 数据库 Schema 设计
- [x] 步骤 2: 后端频道管理接口
- [x] 步骤 3: WebSocket 实时频道状态同步
- [x] 步骤 4: 前端频道列表 UI
- [x] 步骤 5: 私有频道语音房间 UI
- [x] 步骤 6: Speaking Indicator 逻辑完善
- [x] 步骤 7: 创建频道、退出频道、权限控制

## 📁 项目结构

```
QuickChat/
├── backend/           # NestJS 后端
│   ├── src/
│   │   ├── database/          # 数据库模块
│   │   ├── modules/
│   │   │   ├── channels/      # 频道模块
│   │   │   ├── voice/         # 语音/WS 模块
│   │   │   ├── redis/         # Redis 模块
│   │   │   └── auth/          # 认证模块
│   │   └── common/            # 公共模块
│   └── package.json
│
├── frontend/          # Next.js 前端
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/       # 组件
│   │   │   ├── channel/      # 频道组件
│   │   │   ├── voice/        # 语音组件
│   │   │   ├── message/      # 消息组件
│   │   │   ├── member/       # 成员组件
│   │   │   └── layout/       # 布局组件
│   │   ├── hooks/            # 自定义 Hooks
│   │   ├── store/            # 状态管理
│   │   ├── services/         # 服务层
│   │   ├── types/            # 类型定义
│   │   └── utils/            # 工具函数
│   └── package.json
│
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 后端设置

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 文件配置数据库连接
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run start:dev
```

后端将在 `http://localhost:3001` 启动。

### 前端设置

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

前端将在 `http://localhost:3000` 启动。

### Docker 设置（可选）

```bash
docker-compose up -d postgres redis
```

## 🎮 功能特性

### ✅ 已实现

**后端**
- PostgreSQL + Prisma 数据库
- 频道 CRUD API
- 用户认证（JWT）
- WebSocket 实时通信
- Redis 状态缓存
- 频道成员管理

**前端**
- Discord 风格深色主题
- 频道列表（公共/私有分组）
- 创建频道（类型选择、密码设置）
- 公共频道文本聊天
- 私有频道语音房间 UI
- 参与者网格展示
- 语音控制栏
- 说话状态指示器
- 音量可视化
- 成员列表
- WebSocket 实时状态同步
- Web Audio API 音频分析
- 智能说话检测算法
- 自适应阈值校准
- 完整的频道生命周期管理
- 密码保护频道
- 频道设置（所有者）

### 🚧 开发中

暂无

### 📋 计划中

- WebRTC 音频流传输（Mediasoup）
- 视频通话
- 屏幕共享
- 文件分享
- 表情回复
- 用户资料编辑
- 好友系统

## 📡 API 端点

### 频道管理

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/channels` | 获取频道列表 | ✅ |
| GET | `/channels/:id` | 获取频道详情 | ✅ |
| POST | `/channels` | 创建频道 | ✅ |
| PATCH | `/channels/:id` | 更新频道 | ✅ |
| DELETE | `/channels/:id` | 删除频道 | ✅ |
| POST | `/channels/:id/join` | 加入频道 | ✅ |
| POST | `/channels/:id/leave` | 退出频道 | ✅ |
| GET | `/channels/:id/members` | 获取成员列表 | ✅ |
| GET | `/channels/:id/messages` | 获取消息历史 | ✅ |

### WebSocket 事件

**客户端 → 服务器**
- `join_voice_channel` - 加入语音频道
- `leave_voice_channel` - 退出语音频道
- `microphone_state_change` - 麦克风状态变化
- `speaking_state_change` - 说话状态变化
- `heartbeat` - 心跳保活

**服务器 → 客户端**
- `connected` - 连接成功
- `user_joined` - 用户加入
- `user_left` - 用户离开
- `user_speaking_state_changed` - 说话状态变化
- `user_microphone_state_changed` - 麦克风状态变化
- `heartbeat_ack` - 心跳响应

## 🎨 UI 设计

### Discord 风格深色主题

```css
--primary: #5865f2;       /* 品牌色 */
--bg-primary: #36393f;    /* 主背景 */
--bg-secondary: #2f3136;  /* 次级背景 */
--bg-tertiary: #202225;   /* 三级背景 */
--text-normal: #dcddde;   /* 普通文字 */
--text-muted: #72767d;    /* 弱化文字 */
--success: #3ba55c;       /* 成功/在线 */
--danger: #ed4245;        /* 危险/离线 */
```

### 说话状态可视化

1. **头像光环** - 绿色 ping 动画
2. **声波动画** - 4条波形跳动
3. **音量条** - 5格显示
4. **状态图标** - 麦克风变化

## 📊 数据库 Schema

### 核心表

- **users** - 用户表
- **channels** - 频道表
- **channel_members** - 频道成员关系表
- **messages** - 消息表

详细 Schema 参见 `backend/src/database/prisma/schema.prisma`

## 🔧 技术栈

### 后端
- **框架**: NestJS 10.x
- **数据库**: PostgreSQL 15+
- **ORM**: Prisma
- **认证**: JWT + Passport
- **实时通信**: Socket.io
- **缓存**: Redis (ioredis)

### 前端
- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **实时通信**: Socket.io-client
- **HTTP**: Axios
- **图标**: Lucide React
- **日期**: date-fns

## 📖 开发文档

- [步骤 1: 数据库 Schema](./STEP1_SCHEMA.md)
- [步骤 2: 后端频道管理](./STEP2_BACKEND.md)
- [步骤 3: WebSocket 实时同步](./STEP3_WEBSOCKET.md)
- [步骤 4: 前端频道列表 UI](./STEP4_FRONTEND.md)
- [步骤 5: 语音房间 UI](./STEP5_SUMMARY.md)
- [步骤 6: 说话指示器逻辑](./docs/STEP_6_GUIDE.md)
- [步骤 7: 频道管理功能](./docs/STEP_7_GUIDE.md)

## 🐛 已知问题

1. **音频流传输未实现**
   - 当前实现了音频分析和说话检测
   - 实际的 P2P/SFU 音频流传输需要 Mediasoup 集成

2. **权限验证待完善**
   - 前端实现了完整的权限控制逻辑
   - 后端 JWT 认证需要进一步集成测试

3. **媒体服务器**
   - 当前使用 WebSocket 传输状态
   - 需要部署 Mediasoup SFU 服务器实现实际音频传输

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

- 项目主页: [QuickChat](https://github.com/yourusername/quickchat)
- 问题反馈: [Issues](https://github.com/yourusername/quickchat/issues)
