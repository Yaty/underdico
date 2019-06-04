import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { BaseModelDto } from '../../shared/base.model';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateRoomDto extends BaseModelDto {
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
}
