import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class CreateWordDto {
  @ApiModelProperty()
  @IsString()
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

  @ApiModelPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  readonly example?: string;
}
