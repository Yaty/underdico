import { BaseModelDto } from '../../shared/base.model';
import { ApiModelProperty } from '@nestjs/swagger';

export class VoteDto extends BaseModelDto {
  @ApiModelProperty()
  readonly value: boolean;

  @ApiModelProperty()
  readonly userId: boolean;
}
