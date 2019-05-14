import { ApiModelProperty } from '@nestjs/swagger';

export class CreateVoteDto {
  @ApiModelProperty()
  readonly value: boolean;
}
