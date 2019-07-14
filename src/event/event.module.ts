import { Module } from '@nestjs/common';
import { EventGateway } from './event.gateway';
import { RoomModule } from '../room/room.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    RoomModule,
    UserModule,
  ],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule {}
