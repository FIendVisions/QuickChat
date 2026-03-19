// backend/src/common/decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * 当前用户装饰器
 * 从 JWT 中提取用户信息，注入到控制器方法中
 *
 * 使用示例：
 * @Post()
 * async create(@CurrentUser() user: User) {
 *   // user.id, user.username, etc.
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      // JWT 守卫被禁用时的临时解决方案
      // 返回数据库中的真实用户作为默认用户，用于开发和测试
      // 注意：生产环境必须启用 JWT 认证
      console.warn('⚠️  No user found in request (JWT auth disabled). Using default test user (admin).');
      return {
        id: '5b3b3e13-e544-40a9-ae37-ce7045d598af', // admin user ID from database
        username: 'admin',
        email: 'admin@example.com',
      };
    }

    // 如果指定了字段，只返回该字段
    return data ? user[data] : user;
  },
);
