import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class CreateRoomDto {
  @ApiModelProperty()
  @IsString()
  @MinLength(3)
  readonly name: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly maxPlayers?: number;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isPrivate?: boolean;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isRanked?: boolean;

  @ApiModelPropertyOptional()
  @IsIso6391({
    optional: true,
  })
  readonly locale?: string;
}
