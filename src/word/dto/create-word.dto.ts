import { ApiModelProperty } from '@nestjs/swagger';
import { ArrayUnique, IsAlphanumeric, IsArray, IsOptional, IsString, Length } from 'class-validator';

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

  @ApiModelProperty()
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({each: true})
  readonly tags?: string[];
}
