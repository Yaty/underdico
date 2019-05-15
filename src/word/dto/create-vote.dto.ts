import { ApiModelProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class CreateVoteDto {
  @ApiModelProperty()
  @IsBoolean()
  readonly value: boolean;
}
