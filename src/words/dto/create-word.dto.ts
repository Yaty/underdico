import { ApiModelProperty } from '@nestjs/swagger';

export class CreateWordDto {
  @ApiModelProperty()
  readonly word: string;

  @ApiModelProperty()
  readonly definition: string;

  @ApiModelProperty()
  readonly tags: string[];
}
