// frontend/src/lib/authStorage.ts

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  password: string; // 在实际应用中应该hash存储
  createdAt: string;
}

const STORAGE_KEY = 'quickchat_users';

/**
 * 获取所有用户
 */
export function getAllUsers(): StoredUser[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 保存用户列表
 */
function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

/**
 * 检查用户名是否已存在
 */
export function usernameExists(username: string): boolean {
  const users = getAllUsers();
  return users.some(u => u.username.toLowerCase() === username.toLowerCase());
}

/**
 * 检查邮箱是否已存在
 */
export function emailExists(email: string): boolean {
  const users = getAllUsers();
  return users.some(u => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * 创建新用户
 */
export function createUser(username: string, email: string, password: string): StoredUser {
  const users = getAllUsers();

  // 检查用户名
  if (usernameExists(username)) {
    throw new Error('用户名已被使用');
  }

  // 检查邮箱
  if (emailExists(email)) {
    throw new Error('邮箱已被注册');
  }

  // 验证密码长度
  if (password.length < 6) {
    throw new Error('密码至少需要6个字符');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('邮箱格式不正确');
  }

  const newUser: StoredUser = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  return newUser;
}

/**
 * 验证用户登录
 */
export function validateUser(username: string, password: string): StoredUser | null {
  const users = getAllUsers();
  const user = users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  return user || null;
}
