// test-websocket.js
// 测试 WebSocket 实时消息

const io = require('socket.io-client');

const userId = 'test-user-' + Date.now();
const channelId = '8a7403bb-bb82-4de6-b321-bbf4f4d1d609'; // 从日志中获取的真实频道ID

console.log('========== WebSocket 测试客户端 ==========');
console.log('User ID:', userId);
console.log('Channel ID:', channelId);
console.log('');

const socket = io('http://localhost:3001', {
  auth: { userId },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ 已连接到服务器，Socket ID:', socket.id);

  // 加入频道
  console.log('🏠 加入频道...');
  socket.emit('join:channel', { channelId, userId });
});

socket.on('connect_error', (err) => {
  console.error('❌ 连接错误:', err);
});

// 监听所有事件
socket.onAny((eventName, ...args) => {
  console.log(`📨 收到事件: ${eventName}`, args.length > 0 ? args[0] : '');
});

// 特别监听消息
socket.on('message:new', (data) => {
  console.log('🔥🔥🔥 收到新消息!!!', JSON.stringify(data));
});

// 5秒后模拟发送HTTP消息请求
setTimeout(async () => {
  console.log('========== 发送测试消息 ==========');

  try {
    const response = await fetch('http://localhost:3001/channels/' + channelId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '测试消息 ' + new Date().toISOString(),
        userId: userId,
        username: 'TestUser',
      }),
    });

    const result = await response.json();
    console.log('✅ HTTP 请求成功:', JSON.stringify(result));
  } catch (err) {
    console.error('❌ HTTP 请求失败:', err);
  }

  // 10秒后断开
  setTimeout(() => {
    console.log('========== 断开连接 ==========');
    socket.disconnect();
    process.exit(0);
  }, 10000);
}, 5000);
