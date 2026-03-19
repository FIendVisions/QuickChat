// 测试实时消息同步
const io = require('socket.io-client');

console.log('==========================================');
console.log('实时消息同步测试');
console.log('==========================================');
console.log('');

const CHANNEL_ID = '8a7403bb-bb82-4de6-b321-bbf4f4d1d609';
const USER1 = 'test-user-1';
const USER2 = 'test-user-2';

let user1Socket = null;
let user2Socket = null;
let messageReceived = false;

// 创建用户1的连接
function connectUser1() {
  return new Promise((resolve, reject) => {
    console.log('🔌 用户1 连接中...');
    user1Socket = io('http://localhost:3001', {
      auth: { userId: USER1 },
      transports: ['websocket', 'polling'],
    });

    user1Socket.on('connect', () => {
      console.log(`✅ 用户1 已连接 (Socket ID: ${user1Socket.id})`);

      // 加入频道
      console.log(`🏠 用户1 加入频道 ${CHANNEL_ID}`);
      user1Socket.emit('join:channel', {
        channelId: CHANNEL_ID,
        userId: USER1,
      });

      setTimeout(() => {
        resolve();
      }, 500);
    });

    user1Socket.on('connect_error', (err) => {
      console.error('❌ 用户1 连接失败:', err);
      reject(err);
    });

    // 监听消息
    user1Socket.on('message:new', (data) => {
      console.log(`📨 用户1 收到消息:`, data);
    });

    user1Socket.onAny((eventName, ...args) => {
      if (eventName.includes('message') || eventName.includes('channel') || eventName.includes('member')) {
        console.log(`🔍 [用户1] 事件: ${eventName}`, args[0]);
      }
    });
  });
}

// 创建用户2的连接
function connectUser2() {
  return new Promise((resolve, reject) => {
    console.log('🔌 用户2 连接中...');
    user2Socket = io('http://localhost:3001', {
      auth: { userId: USER2 },
      transports: ['websocket', 'polling'],
    });

    user2Socket.on('connect', () => {
      console.log(`✅ 用户2 已连接 (Socket ID: ${user2Socket.id})`);

      // 加入频道
      console.log(`🏠 用户2 加入频道 ${CHANNEL_ID}`);
      user2Socket.emit('join:channel', {
        channelId: CHANNEL_ID,
        userId: USER2,
      });

      setTimeout(() => {
        resolve();
      }, 500);
    });

    user2Socket.on('connect_error', (err) => {
      console.error('❌ 用户2 连接失败:', err);
      reject(err);
    });

    // 监听消息
    user2Socket.on('message:new', (data) => {
      console.log(`📨📨📨 用户2 收到消息！`, data);
      messageReceived = true;
    });

    user2Socket.onAny((eventName, ...args) => {
      if (eventName.includes('message') || eventName.includes('channel') || eventName.includes('member')) {
        console.log(`🔍 [用户2] 事件: ${eventName}`, args[0]);
      }
    });
  });
}

// 发送测试消息
async function sendTestMessage() {
  console.log('');
  console.log('📤 用户1 发送测试消息...');

  try {
    const response = await fetch(`http://localhost:3001/channels/${CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '这是一条测试消息',
        userId: USER1,
        username: 'TestUser1',
      }),
    });

    const result = await response.json();
    console.log('✅ 消息已发送:', result);
  } catch (error) {
    console.error('❌ 发送失败:', error);
  }
}

// 主测试流程
async function runTest() {
  try {
    // 连接两个用户
    await connectUser1();
    await connectUser2();

    console.log('');
    console.log('⏳ 等待2秒，确保连接稳定...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 发送消息
    await sendTestMessage();

    // 等待消息接收
    console.log('');
    console.log('⏳ 等待3秒，检查消息是否同步...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查结果
    console.log('');
    console.log('==========================================');
    if (messageReceived) {
      console.log('✅✅✅ 测试成功！用户2收到了用户1的消息！');
    } else {
      console.log('❌❌❌ 测试失败！用户2没有收到消息！');
      console.log('');
      console.log('可能的原因：');
      console.log('1. 用户2没有正确加入房间');
      console.log('2. 后端广播没有到达用户2');
      console.log('3. 事件名称不匹配');
    }
    console.log('==========================================');

    // 断开连接
    user1Socket.disconnect();
    user2Socket.disconnect();

    process.exit(messageReceived ? 0 : 1);
  } catch (error) {
    console.error('❌ 测试出错:', error);
    process.exit(1);
  }
}

// 运行测试
runTest();
