// backend/test-websocket-connection.js
// 简单测试：验证 WebSocket 服务器是否正常

const io = require('socket.io-client');

console.log('========== 测试 WebSocket 连接 ==========');

const testSocket = io('http://localhost:3001', {
  auth: { userId: 'test-connection-check' },
  transports: ['websocket'],
  timeout: 5000,
});

let connected = false;

setTimeout(() => {
  if (!connected) {
    console.log('❌ 连接超时！');
    process.exit(1);
  }
}, 5000);

testSocket.on('connect', () => {
  connected = true;
  console.log('✅ WebSocket 连接成功！');
  console.log('✅ Socket ID:', testSocket.id);

  // 测试加入频道
  const channelId = '8a7403bb-bb82-4de6-b321-bbf4f4d1d609';
  console.log('🏠 加入频道:', channelId);

  testSocket.emit('join:channel', {
    channelId,
    userId: 'test-connection-check',
  });

  // 等待后端响应
  setTimeout(() => {
    console.log('✅ 测试完成，断开连接');
    testSocket.disconnect();
    process.exit(0);
  }, 2000);
});

testSocket.on('connect_error', (err) => {
  console.error('❌ 连接错误:', err);
  process.exit(1);
});

testSocket.on('error', (err) => {
  console.error('❌ Socket 错误:', err);
});
