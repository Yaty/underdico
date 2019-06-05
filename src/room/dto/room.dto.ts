import { ApiModelProperty } from '@nestjs/swagger';
import { BaseModelDto } from '../../shared/base.model';
import { IsArray, IsBoolean, IsEnum, IsInt, IsPositive, IsString, MinLength } from 'class-validator';
import { RoomStatus } from '../models/room-status.enum';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class RoomDto extends BaseModelDto {
  @ApiModelProperty()
  @IsString()
  @MinLength(3)
  readonly name: string;

  @ApiModelProperty()
  @IsInt()
  @IsPositive()
  readonly maxPlayers: number;

  @ApiModelProperty()
  @IsBoolean()
  readonly isPrivate: boolean;

  @ApiModelProperty()
  @IsBoolean()
  readonly isRanked: boolean;

  @ApiModelProperty({
    enum: RoomStatus,
  })
  @IsEnum(RoomStatus)
  readonly status: RoomStatus;

  @ApiModelProperty()
  @IsArray()
  readonly playersIds: string[];

  @ApiModelProperty()
  @IsString()
  readonly ownerId: string;

  @ApiModelProperty()
  @IsIso6391()
  readonly locale: string;
}
