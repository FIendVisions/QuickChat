// backend/src/modules/channels/channels.module.ts

import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaModule } from '../../database/prisma.module';
import { GatewayModule } from '../../gateway/gateway.module';
import { MessageQueueModule } from '../../message-queue/message-queue.module';

/**
 * 频道模块
 * 负责频道的 CRUD 操作、成员管理、消息查询
 */
@Module({
  imports: [PrismaModule, GatewayModule, MessageQueueModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService], // 导出供其他模块使用
})
export class ChannelsModule {}
