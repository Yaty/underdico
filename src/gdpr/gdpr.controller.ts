import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiImplicitParam,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnprocessableEntityResponse,
  ApiUseTags,
} from '@nestjs/swagger';
import { ApiException } from '../shared/api-exception.model';
import { GetOperationId } from '../shared/utilities/get-operation-id.helper';
import { Roles } from '../shared/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../shared/guards/roles.guard';
import { RoomService } from '../room/room.service';
import { VoteService } from '../vote/vote.service';
import { WordService } from '../word/word.service';
import { UserSummaryDto } from './dto/user-summary.dto';
import { User } from '../user/models/user.model';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/models/user-role.enum';
import { FindByIdParamsDto } from '../user/dto/find-by-id-params.dto';

@Controller()
@ApiUseTags(User.modelName)
@ApiBearerAuth()
export class GDPRController {
  constructor(
    private readonly userService: UserService,
    private readonly roomService: RoomService,
    private readonly voteService: VoteService,
    private readonly wordService: WordService,
  ) {}

  @Get('/users/:userId/summary')
  @Roles(UserRole.Admin, UserRole.User)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOkResponse({ type: UserSummaryDto })
  @ApiUnprocessableEntityResponse({ type: ApiException })
  @ApiNotFoundResponse({ type: ApiException })
  @ApiOperation(GetOperationId(User.modelName, 'GetSummary'))
  @ApiImplicitParam({ name: 'userId', required: true })
  async getUserSummary(
    @Param() params: FindByIdParamsDto,
  ): Promise<UserSummaryDto> {
    const [user, rooms, votes, words] = await Promise.all([
      this.userService.findUserById(params.userId),
      this.roomService.findUserRooms(params.userId),
      this.voteService.findUserVotes(params.userId),
      this.wordService.findUserWords(params.userId),
    ]);

    return {
      user: this.userService.mapper.map(user),
      rooms: this.roomService.mapper.mapArray(rooms),
      votes: this.voteService.mapper.mapArray(votes),
      words: this.wordService.mapper.mapArray(words, WordService.toObjectId(params.userId)),
    };
  }
}
