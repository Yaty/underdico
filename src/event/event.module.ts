import { forwardRef, Module } from '@nestjs/common';
import { EventGateway } from './event.gateway';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [
    forwardRef(() => RoomModule),
  ],
  providers: [EventGateway],
  exports: [EventGateway],
})
export class EventModule {}
