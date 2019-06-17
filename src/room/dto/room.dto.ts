import { ApiModelProperty } from '@nestjs/swagger';
import { BaseModelDto } from '../../shared/base.model';
import { RoomStatus } from '../models/room-status.enum';
import { RoundDto } from './round.dto';

export class RoomDto extends BaseModelDto {
  @ApiModelProperty()
  readonly name: string;

  @ApiModelProperty()
  readonly maxPlayers: number;

  @ApiModelProperty()
  readonly isPrivate: boolean;

  @ApiModelProperty()
  readonly isRanked: boolean;

  @ApiModelProperty({
    enum: RoomStatus,
  })
  readonly status: RoomStatus;

  @ApiModelProperty()
  readonly playersIds: string[];

  @ApiModelProperty()
  readonly ownerId: string;

  @ApiModelProperty()
  readonly locale: string;

  @ApiModelProperty()
  readonly rounds: RoundDto[];
}
