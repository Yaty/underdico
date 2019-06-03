import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsAlphanumeric, IsArray, IsOptional, IsString, Length } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class CreateWordDto {
  @ApiModelProperty()
  @IsString()
  @IsAlphanumeric()
  @Length(1, 64)
  readonly name: string;

  @ApiModelProperty()
  @IsString()
  @Length(1, 2048)
  readonly definition: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({each: true})
  readonly tags?: string[];

  @ApiModelPropertyOptional()
  @IsIso6391({
    optional: true,
  })
  readonly locale?: string;
}
