// 测试认证逻辑
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  USERNAME: 'username',
};

// 清除旧数据
console.log('清除旧数据...');
Object.values(STORAGE_KEYS).forEach(key => {
  localStorage.removeItem(key);
});

// 设置测试数据
console.log('设置测试数据...');
localStorage.setItem(STORAGE_KEYS.TOKEN, 'test-token');
localStorage.setItem(STORAGE_KEYS.USER_ID, 'test-user-123');
localStorage.setItem(STORAGE_KEYS.USERNAME, '测试用户');

// 验证
console.log('验证数据:');
console.log('Token:', localStorage.getItem(STORAGE_KEYS.TOKEN));
console.log('UserId:', localStorage.getItem(STORAGE_KEYS.USER_ID));
console.log('Username:', localStorage.getItem(STORAGE_KEYS.USERNAME));

console.log('测试完成！');
