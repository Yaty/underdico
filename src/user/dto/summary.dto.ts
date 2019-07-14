import { UserDto } from './user.dto';
import { RoomDto } from '../../room/dto/room.dto';
import { WordDto } from '../../word/dto/word.dto';
import { VoteDto } from '../../vote/dto/vote.dto';

export class SummaryDto {
  public user: UserDto;
  public rooms: RoomDto[];
  public words: WordDto[];
  public votes: VoteDto[];
}
