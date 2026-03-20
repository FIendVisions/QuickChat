// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ServersModule } from './modules/servers/servers.module';
import { AuthModule } from './modules/auth/auth.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ServersModule,
    ChannelsModule,
    GatewayModule,
  ],
})
export class AppModule {}
