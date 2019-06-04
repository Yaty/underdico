import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { AuthService } from '../shared/auth/auth.service';
import { BaseService } from '../shared/base.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { RoomMapper } from '../shared/mappers/room.mapper';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService extends BaseService<Room, RoomDto> {
  constructor(
    @InjectModel(Room.modelName) private readonly roomModel: ModelType<Room>,
    mapper: RoomMapper,
    @Inject(forwardRef(() => AuthService)) readonly authService: AuthService,
  ) {
    super(roomModel, mapper);
  }

  getRooms(): Promise<Room[]> {
    return this.roomModel
      .aggregate()
      .exec();
  }

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const room = Room.createModel();
    Object.apply(room, dto);
    const savedRoom = await room.save();
    return savedRoom.toJSON();
  }
}
