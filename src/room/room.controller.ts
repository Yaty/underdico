import { Controller, Get, Post } from '@nestjs/common';
import { ApiUseTags } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('rooms')
@ApiUseTags(Room.modelName)
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
  ) {}

  @Get()
  async getRooms(): Promise<RoomDto[]> {
    const rooms = await this.roomService.getRooms();
    return this.roomService.mapper.mapArray(rooms);
  }

  @Post()
  async createRoom(dto: CreateRoomDto): Promise<RoomDto> {
    const room = await this.roomService.createRoom(dto);
    return this.roomService.mapper.map(room);
  }
}
