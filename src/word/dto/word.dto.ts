import { Schema } from 'mongoose';
import { BaseModelDto } from '../../shared/base.model';
import { ApiModelProperty } from '@nestjs/swagger';

export class WordDto extends BaseModelDto {
  @ApiModelProperty()
  readonly name: string;

  @ApiModelProperty()
  readonly definition: string;

  @ApiModelProperty()
  readonly userId: Schema.Types.ObjectId;

  @ApiModelProperty()
  readonly tags: string[];

  @ApiModelProperty()
  readonly score: number;

  @ApiModelProperty()
  readonly userUpVoted: boolean;

  @ApiModelProperty()
  readonly userDownVoted: boolean;
}
