import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * 序列号生成器
 * 实现 Telegram 风格的递增序列号
 */
@Injectable()
export class SequenceGeneratorService {
  constructor(private prisma: PrismaService) {}

  /**
   * 为频道的下一条消息生成序列号
   */
  async getNextSequence(channelId: string): Promise<number> {
    // 查询频道中最大的序列号
    const lastMessage = await this.prisma.message.findFirst({
      where: { channelId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });

    const nextSequence = (lastMessage?.sequence ?? 0) + 1;
    return nextSequence;
  }

  /**
   * 批量生成序列号（用于消息导入等场景）
   */
  async getBatchSequence(channelId: string, count: number): Promise<number> {
    const lastMessage = await this.prisma.message.findFirst({
      where: { channelId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });

    const startSequence = (lastMessage?.sequence ?? 0) + 1;
    return startSequence;
  }
}
