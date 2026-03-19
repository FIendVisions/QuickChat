// backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 创建管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@quickchat.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ONLINE',
    },
  });
  console.log('Created admin user:', admin);

  // 创建测试用户
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@example.com',
      password: userPassword,
      role: 'USER',
      status: 'ONLINE',
    },
  });
  console.log('Created test user:', user1);

  // 创建公共频道
  const publicChannel = await prisma.channel.create({
    data: {
      name: '游戏大厅',
      type: 'PUBLIC',
      ownerId: admin.id,
      description: '欢迎来到游戏大厅！',
    },
  });
  console.log('Created public channel:', publicChannel);

  // 创建私有频道
  const privateChannel = await prisma.channel.create({
    data: {
      name: '开黑车队',
      type: 'PRIVATE',
      ownerId: user1.id,
      description: '一起排位上分！',
      maxParticipants: 5,
    },
  });
  console.log('Created private channel:', privateChannel);

  // 用户加入频道
  await prisma.channelMember.create({
    data: {
      channelId: publicChannel.id,
      userId: user1.id,
    },
  });
  await prisma.channelMember.create({
    data: {
      channelId: privateChannel.id,
      userId: user1.id,
    },
  });

  // 创建测试消息
  await prisma.message.create({
    data: {
      channelId: publicChannel.id,
      userId: admin.id,
      type: 'TEXT',
      content: '欢迎来到 QuickChat！',
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
