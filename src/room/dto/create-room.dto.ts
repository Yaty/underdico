import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class CreateRoomDto {
  @ApiModelProperty()
  @IsString()
  @MinLength(3)
  readonly name: string;

  @ApiModelPropertyOptional({
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
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

  @ApiModelPropertyOptional({
    minimum: 5,
    maximum: 5 * 60,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(5 * 60)
  readonly timeout?: number;
}
