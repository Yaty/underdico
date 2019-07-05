import { Injectable } from '@nestjs/common';
import { BaseMapper } from './base.mapper';
import { morphism } from 'morphism';
import { Room } from '../../room/models/room.model';
import { RoomDto } from '../../room/dto/room.dto';

@Injectable()
export class RoomMapper extends BaseMapper<RoomDto, Room> {
  constructor() {
    super({
      id: '_id',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      name: 'name',
      isPrivate: 'isPrivate',
      maxPlayers: 'maxPlayers',
      ownerId: 'ownerId',
      playersIds: 'playersIds',
      isRanked: 'isRanked',
      status: 'status',
      locale: 'locale',
      rounds: 'rounds',
      usernames: 'usernames',
    });
  }

  public map(room: Room): RoomDto {
    return morphism(this.schema, room);
  }

  public mapArray(input: Room[]): RoomDto[] {
    return input.map((i) => this.map(i));
  }
}
