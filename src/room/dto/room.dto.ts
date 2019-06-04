import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { BaseModelDto } from '../../shared/base.model';
import { IsArray, IsBoolean, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class RoomDto extends BaseModelDto {
  @ApiModelProperty()
  @IsString()
  @MinLength(3)
  readonly name: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly maxPlayers: number;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly isPrivate: boolean;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsArray()
  readonly playersIds: string[];

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsString()
  readonly ownerId: string;
}
