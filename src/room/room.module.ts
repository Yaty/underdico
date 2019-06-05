import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { WordModule } from '../word/word.module';
import { Room } from './models/room.model';
import { RoomMapper } from '../shared/mappers/room.mapper';

@Module({
  imports: [
    MongooseModule.forFeature([{
      name: Room.modelName,
      schema: Room.model.schema,
    }]),
    WordModule,
  ],
  providers: [RoomService, RoomMapper],
  controllers: [RoomController],
  exports: [],
})
export class RoomModule {}
