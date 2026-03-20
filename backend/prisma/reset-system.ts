/**
 * 清空所有用户、频道、成员、消息，并恢复系统最小可用数据：
 * - 管理员账号 admin / admin123（可通过环境变量覆盖）
 * - 官方频道 public-official（公共频道）
 *
 * 用法: npx ts-node prisma/reset-system.ts
 * 或: npm run db:reset-system
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('正在清空数据库…');

  await prisma.message.deleteMany({});
  await prisma.channelMember.deleteMany({});
  await prisma.channel.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('已删除全部消息、成员、频道、用户。');

  const adminPlain = process.env.RESET_ADMIN_PASSWORD || 'admin123';
  const adminPassword = await bcrypt.hash(adminPlain, 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@quickchat.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'OFFLINE',
    },
  });

  await prisma.channel.create({
    data: {
      id: 'public-official',
      name: '公共频道',
      type: 'PUBLIC',
      ownerId: admin.id,
      description: '官方频道 - 所有用户可加入',
    },
  });

  await prisma.channelMember.create({
    data: {
      channelId: 'public-official',
      userId: admin.id,
    },
  });

  console.log('已恢复：');
  console.log(`  - 用户 admin（密码: ${adminPlain}）`);
  console.log('  - 频道 public-official（公共频道）');
  console.log('完成。');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
