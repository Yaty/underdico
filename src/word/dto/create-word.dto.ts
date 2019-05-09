import { ApiModelProperty } from '@nestjs/swagger';

export class CreateWordDto {
  @ApiModelProperty()
  readonly name: string;

  @ApiModelProperty()
  readonly definition: string;

  @ApiModelProperty()
  readonly tags: string[];
}
