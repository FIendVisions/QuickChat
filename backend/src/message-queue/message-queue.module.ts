import { Module } from '@nestjs/common';
import { MessageAckService } from './message-ack.service';
import { SequenceGeneratorService } from './sequence-generator.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  providers: [MessageAckService, SequenceGeneratorService, PrismaService],
  exports: [MessageAckService, SequenceGeneratorService],
})
export class MessageQueueModule {}
