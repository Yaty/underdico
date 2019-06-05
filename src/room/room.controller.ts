import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Pagination } from '../shared/decorators/pagination.decorator';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';

@Controller('rooms')
@ApiUseTags(Room.modelName)
@ApiBearerAuth()
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
  ) {}

  @Get()
  @ApiOkResponse({ type: RoomDto, isArray: true })
  @ApiOperation(GetOperationId(Room.modelName, 'GetRooms'))
  async getRooms(
    @Pagination() range,
    @Res() res,
  ): Promise<RoomDto[]> {
    const { skip, take, limit } = range;

    const {
      rooms,
      count,
    } = await this.roomService.getRooms(skip, take);

    res.set('Content-Range', `${skip}-${skip + rooms.length - 1}/${count}`);
    res.set('Accept-Range', `${Room.modelName} ${limit}`);

    return this.roomService.mapper.mapArray(rooms);
  }

  @Post()
  @ApiCreatedResponse({ type: RoomDto })
  @ApiOperation(GetOperationId(Room.modelName, 'CreateRoom'))
  async createRoom(
    @Body() dto: CreateRoomDto,
    @Req() req,
    @Res() res,
  ): Promise<void> {
    const room = await this.roomService.createRoom(dto, req.user);
    res.set('Location', `${req.protocol}://${req.get('host')}/api/rooms/${room._id}`);
    res.status(201).json(this.roomService.mapper.map(room));
  }
}
