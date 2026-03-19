// backend/src/common/guards/channel-owner.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

/**
 * 频道所有者守卫
 * 验证当前用户是否是频道的创建者
 *
 * 使用示例：
 * @UseGuards(ChannelOwnerGuard)
 * @Patch(':id')
 * async update(@Param('id') channelId: string) {
 *   // 只有频道所有者可以访问
 * }
 */
@Injectable()
export class ChannelOwnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const channelId = request.params.id || request.params.channelId;

    if (!user || !channelId) {
      throw new ForbiddenException('Invalid request');
    }

    // 查询频道
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { ownerId: true },
    });

    if (!channel) {
      throw new ForbiddenException('Channel not found');
    }

    // 验证是否是所有者
    if (channel.ownerId !== user.id) {
      throw new ForbiddenException('You are not the owner of this channel');
    }

    return true;
  }
}
