import { BaseModelDto } from '../../shared/base.model';
import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';

export class WordDto extends BaseModelDto {
  @ApiModelProperty()
  readonly name: string;

  @ApiModelProperty()
  readonly definition: string;

  @ApiModelProperty()
  readonly userId: string;

  @ApiModelProperty()
  readonly tags: string[];

  @ApiModelProperty()
  readonly score: number;

  @ApiModelPropertyOptional()
  readonly userUpVoted?: boolean;

  @ApiModelPropertyOptional()
  readonly userDownVoted?: boolean;

  @ApiModelPropertyOptional()
  readonly userVoteId?: string;

  @ApiModelProperty()
  readonly user: UserDto;
}
