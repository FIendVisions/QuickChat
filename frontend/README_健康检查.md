# QuickChat 前端诊断指南

## ✅ 当前状态（已检查通过）

- ✅ 前端服务器运行中（端口 3000）
- ✅ 后端服务器运行中（端口 3001）
- ✅ API 连接正常
- ✅ 前端页面可访问
- ✅ 环境变量配置正确
- ✅ 构建文件存在

## 🔍 浏览器测试步骤

### 1. 打开前端页面
```
http://localhost:3000
```

### 2. 检查浏览器控制台
打开开发者工具（F12），查看 Console 标签：
- 如果有红色错误信息，请记录错误内容
- 如果有黄色警告，通常可以忽略

### 3. 测试功能
- 登录/注册账号
- 创建频道
- 发送消息
- 切换频道

## 🛠️ 常见问题排查

### 问题 1: 页面卡在"加载中"
**解决方案：**
```bash
# 清理缓存并重启
rm -rf .next
npm run dev
```

### 问题 2: WebSocket 连接失败
**检查清单：**
- 后端是否在运行（端口 3001）
- 浏览器控制台是否显示连接错误
- 环境变量是否正确：
  ```bash
  cat public/.env.local
  # 应该显示：
  # NEXT_PUBLIC_WS_URL=http://localhost:3001
  # NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

### 问题 3: 消息发送失败
**可能原因：**
- 未登录或 token 过期
- 频道 ID 不正确
- 后端服务未响应

**解决方案：**
1. 刷新页面重新登录
2. 检查后端日志：
   ```bash
   cd ../backend
   npm run start:dev
   ```

### 问题 4: 消息不同步
**需要验证：**
1. 两个浏览器窗口是否都打开了
2. 是否登录了不同的用户
3. 是否在同一个频道
4. WebSocket 是否已连接（控制台应该显示 "✅ Socket.IO 已连接"）

### 问题 5: 频道列表不显示
**检查：**
```bash
# 测试 API
curl http://localhost:3001/channels
# 应该返回频道列表 JSON
```

## 🧪 使用测试页面

打开测试页面进行快速诊断：
```
file:///Users/admin/QuickChat/frontend/test-frontend.html
```

测试页面可以检查：
- API 连接
- WebSocket 连接
- 频道列表获取
- 消息发送

## 📊 性能检查

### 检查网络请求
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 刷新页面
4. 查看所有请求是否成功（绿色 200 状态码）

### 检查 WebSocket
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 筛选 WS（WebSocket）
4. 查看连接状态

## 🔧 重置开发环境

如果所有方法都无效，尝试完全重置：

```bash
# 1. 停止所有服务
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# 2. 清理前端
cd /Users/admin/QuickChat/frontend
rm -rf .next node_modules/.cache

# 3. 清理后端
cd /Users/admin/QuickChat/backend
rm -rf dist

# 4. 重启后端
cd /Users/admin/QuickChat/backend
npm run start:dev &

# 5. 重启前端
cd /Users/admin/QuickChat/frontend
npm run dev &
```

## 📞 提供反馈时请包含：

1. 浏览器控制台的完整错误信息
2. 后端服务器的日志输出
3. 具体操作的步骤描述
4. 预期结果 vs 实际结果
5. 浏览器类型和版本

## 🎯 快速验证命令

```bash
# 运行健康检查
cd /Users/admin/QuickChat/frontend
./check-frontend.sh
```
