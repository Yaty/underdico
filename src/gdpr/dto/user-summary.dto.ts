import { ApiModelProperty } from '@nestjs/swagger';
import { RoomDto } from '../../room/dto/room.dto';
import { VoteDto } from '../../vote/dto/vote.dto';
import { WordDto } from '../../word/dto/word.dto';
import { UserDto } from '../../user/dto/user.dto';

export class UserSummaryDto {
  @ApiModelProperty()
  readonly user: UserDto;

  @ApiModelProperty()
  readonly rooms: RoomDto[];

  @ApiModelProperty()
  readonly votes: VoteDto[];

  @ApiModelProperty()
  readonly words: WordDto[];
}
