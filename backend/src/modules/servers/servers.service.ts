import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ServerMemberRole } from '../../common/types';
import { CreateServerDto } from './dto/create-server.dto';
import { JoinServerDto } from './dto/join-server.dto';

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);

  constructor(private readonly prisma: PrismaService) {}

  private randomInviteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = randomBytes(12);
    let s = '';
    for (let i = 0; i < 8; i++) {
      s += alphabet[buf[i]! % alphabet.length];
    }
    return s;
  }

  private async ensureUserExists(userId: string, username?: string): Promise<void> {
    let dbUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (dbUser) return;

    const norm = username?.trim().toLowerCase();
    if (norm) {
      dbUser = await this.prisma.user.findUnique({ where: { username: norm } });
      if (dbUser) return;
    }

    const uname = norm || `user-${userId.slice(0, 8)}`;
    this.logger.log(`Auto-creating user ${userId} (${uname})`);
    await this.prisma.user.create({
      data: {
        id: userId,
        username: uname,
        status: 'OFFLINE',
      },
    });
  }

  async create(userId: string, dto: CreateServerDto) {
    await this.ensureUserExists(userId, dto.username);

    for (let attempt = 0; attempt < 8; attempt++) {
      const inviteCode = this.randomInviteCode();
      try {
        const server = await this.prisma.server.create({
          data: {
            name: dto.name.trim(),
            icon: dto.icon?.trim() || null,
            ownerId: userId,
            inviteCode,
            members: {
              create: { userId, role: ServerMemberRole.OWNER },
            },
            channelCategories: {
              create: [
                { name: '文字频道', position: 0 },
                { name: '语音频道', position: 1 },
                { name: '论坛', position: 2 },
              ],
            },
          },
          include: {
            owner: { select: { id: true, username: true, avatar: true } },
            _count: { select: { members: true, channels: true } },
          },
        });
        this.logger.log(`Server ${server.id} created by ${userId}`);
        return {
          id: server.id,
          name: server.name,
          icon: server.icon,
          ownerId: server.ownerId,
          inviteCode: server.inviteCode,
          owner: server.owner,
          memberCount: server._count.members,
          channelCount: server._count.channels,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
        };
      } catch (e: any) {
        if (e?.code === 'P2002') continue;
        throw e;
      }
    }
    throw new BadRequestException('无法生成唯一邀请码，请重试');
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: {
        server: {
          include: {
            owner: { select: { id: true, username: true } },
            _count: { select: { members: true, channels: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.server.id,
      name: m.server.name,
      icon: m.server.icon,
      ownerId: m.server.ownerId,
      inviteCode: m.server.inviteCode,
      role: m.role,
      owner: m.server.owner,
      memberCount: m.server._count.members,
      channelCount: m.server._count.channels,
      createdAt: m.server.createdAt,
      updatedAt: m.server.updatedAt,
    }));
  }

  async getOne(serverId: string, userId: string) {
    const member = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
      include: {
        server: {
          include: {
            owner: { select: { id: true, username: true } },
            _count: { select: { members: true, channels: true } },
          },
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this server');
    }

    const s = member.server;
    return {
      id: s.id,
      name: s.name,
      icon: s.icon,
      ownerId: s.ownerId,
      inviteCode: s.inviteCode,
      role: member.role,
      owner: s.owner,
      memberCount: s._count.members,
      channelCount: s._count.channels,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  async join(userId: string, dto: JoinServerDto) {
    await this.ensureUserExists(userId, dto.username);
    const code = dto.inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      throw new BadRequestException('邀请码无效');
    }

    const server = await this.prisma.server.findUnique({
      where: { inviteCode: code },
    });

    if (!server) {
      throw new NotFoundException('无效的邀请码');
    }

    const existing = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: server.id, userId } },
    });

    if (existing) {
      throw new ConflictException('你已在该服务器中');
    }

    await this.prisma.serverMember.create({
      data: {
        serverId: server.id,
        userId,
        role: ServerMemberRole.MEMBER,
      },
    });

    this.logger.log(`User ${userId} joined server ${server.id}`);
    return this.getOne(server.id, userId);
  }

  async leave(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId === userId) {
      throw new BadRequestException('群主不能直接退出，请先删除服务器或转让所有权（暂未实现转让）');
    }

    await this.prisma.serverMember.deleteMany({
      where: { serverId, userId },
    });

    this.logger.log(`User ${userId} left server ${serverId}`);
  }

  async remove(userId: string, serverId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('只有群主可以删除服务器');
    }

    await this.prisma.server.delete({ where: { id: serverId } });
    this.logger.log(`Server ${serverId} deleted by ${userId}`);
  }

  private async assertServerMember(serverId: string, userId: string) {
    const m = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!m) throw new ForbiddenException('You are not a member of this server');
  }

  private async assertServerOwner(serverId: string, userId: string) {
    const s = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { ownerId: true },
    });
    if (!s) throw new NotFoundException('Server not found');
    if (s.ownerId !== userId) {
      throw new ForbiddenException('只有群主可以管理频道分组');
    }
  }

  /**
   * 无分组时创建默认三类，并把无 categoryId 的频道按 kind 归入对应分组
   */
  async ensureCategoriesForServer(serverId: string): Promise<void> {
    const count = await this.prisma.channelCategory.count({ where: { serverId } });
    if (count > 0) return;

    const defaults = ['文字频道', '语音频道', '论坛'];
    await this.prisma.$transaction(
      defaults.map((name, position) =>
        this.prisma.channelCategory.create({
          data: { serverId, name, position },
        }),
      ),
    );

    const cats = await this.prisma.channelCategory.findMany({
      where: { serverId },
      orderBy: { position: 'asc' },
    });
    const c0 = cats[0]?.id;
    const c1 = cats[1]?.id;
    const c2 = cats[2]?.id;
    if (!c0) return;

    const channels = await this.prisma.channel.findMany({
      where: { serverId, categoryId: null },
    });
    for (const ch of channels) {
      let cid = c0;
      if (ch.kind === 'VOICE') cid = c1 || c0;
      else if (ch.kind === 'FORUM') cid = c2 || c0;
      await this.prisma.channel.update({
        where: { id: ch.id },
        data: { categoryId: cid },
      });
    }
  }

  async listCategories(serverId: string, userId: string) {
    await this.assertServerMember(serverId, userId);
    await this.ensureCategoriesForServer(serverId);
    return this.prisma.channelCategory.findMany({
      where: { serverId },
      orderBy: { position: 'asc' },
    });
  }

  async createCategory(serverId: string, userId: string, name: string) {
    await this.assertServerOwner(serverId, userId);
    const agg = await this.prisma.channelCategory.aggregate({
      where: { serverId },
      _max: { position: true },
    });
    const position = (agg._max.position ?? -1) + 1;
    return this.prisma.channelCategory.create({
      data: { serverId, name: name.trim(), position },
    });
  }

  async updateCategory(serverId: string, categoryId: string, userId: string, name: string) {
    await this.assertServerOwner(serverId, userId);
    const cat = await this.prisma.channelCategory.findFirst({
      where: { id: categoryId, serverId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.channelCategory.update({
      where: { id: categoryId },
      data: { name: name.trim() },
    });
  }

  async deleteCategory(serverId: string, categoryId: string, userId: string) {
    await this.assertServerOwner(serverId, userId);
    const cat = await this.prisma.channelCategory.findFirst({
      where: { id: categoryId, serverId },
    });
    if (!cat) throw new NotFoundException('Category not found');
    await this.prisma.channel.updateMany({
      where: { categoryId },
      data: { categoryId: null },
    });
    await this.prisma.channelCategory.delete({ where: { id: categoryId } });
  }
}
