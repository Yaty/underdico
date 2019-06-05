import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ModelType } from 'typegoose';
import { AuthService } from '../shared/auth/auth.service';
import { BaseService } from '../shared/base.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { RoomMapper } from '../shared/mappers/room.mapper';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from './models/room-status.enum';
import { User } from '../user/models/user.model';

@Injectable()
export class RoomService extends BaseService<Room, RoomDto> {
  constructor(
    @InjectModel(Room.modelName) private readonly roomModel: ModelType<Room>,
    mapper: RoomMapper,
    @Inject(forwardRef(() => AuthService)) readonly authService: AuthService,
  ) {
    super(roomModel, mapper);
  }

  async getRooms(skip: number, take: number): Promise<{
    rooms: Room[],
    count: number,
  }> {
    const match = {
      isPrivate: false,
      status: RoomStatus.Created,
    };

    const [rooms, count] = await Promise.all([
      this.roomModel
        .aggregate()
        .match(match)
        .skip(skip)
        .limit(take)
        .exec(),
      this.roomModel.count(match),
    ]);

    return {
      rooms,
      count,
    };
  }

  async createRoom(dto: CreateRoomDto, owner: User): Promise<Room> {
    const room = Room.createModel();

    Object.apply(room, {
      ...dto,
      ownerId: owner._id,
    });

    const savedRoom = await room.save();
    return savedRoom.toJSON();
  }
}
