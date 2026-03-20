import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { MediasoupModule } from '../mediasoup/mediasoup.module';

@Module({
  imports: [MediasoupModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class GatewayModule {}
