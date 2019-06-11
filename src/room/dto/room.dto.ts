import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { BaseModelDto } from '../../shared/base.model';
import { RoomStatus } from '../models/room-status.enum';

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

  @ApiModelProperty({ type: String, format: 'date-time' })
  readonly enteredAt: string;

  @ApiModelProperty({ type: String, format: 'date-time' })
  readonly leavedAt: string;

  @ApiModelPropertyOptional()
  readonly currentWord?: string;

  @ApiModelPropertyOptional()
  readonly currentPlayer?: string;

  @ApiModelProperty()
  readonly words: string[];
}
