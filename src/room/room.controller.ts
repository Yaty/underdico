import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { Room } from './models/room.model';
import { RoomDto } from './dto/room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { Pagination } from '../shared/decorators/pagination.decorator';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../user/models/user-role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { RoomStatus } from './models/room-status.enum';
import { Where } from '../shared/decorators/where.decorator';
import { Sort } from '../shared/decorators/sort.decorator';
import { User } from '../shared/decorators/user.decorator';

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
    @Res() res,
    @Pagination() range,
    @Where() where,
    @Sort() sort,
  ): Promise<void> {
    const { skip, take, limit } = range;

    const {
      rooms,
      count,
    } = await this.roomService.getRooms(skip, take, {
      ...where,
      status:  RoomStatus.Created,
    }, sort);

    res.set('Content-Range', `${skip}-${skip + rooms.length - 1}/${count}`);
    res.set('Accept-Range', `${Room.modelName} ${limit}`);
    res.json(this.roomService.mapper.mapArray(rooms));
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiCreatedResponse({ type: RoomDto })
  @ApiOperation(GetOperationId(Room.modelName, 'CreateRoom'))
  async createRoom(
    @Body() dto: CreateRoomDto,
    @Req() req,
    @User() user,
    @Res() res,
  ): Promise<void> {
    const room = await this.roomService.createRoom(dto, user);
    res.set('Location', `https://${req.get('host')}/api/rooms/${room._id}`);
    res.status(201).json(this.roomService.mapper.map(room));
  }
}
