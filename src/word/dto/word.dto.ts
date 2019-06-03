import { BaseModelDto } from '../../shared/base.model';
import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';
import { IsInt, IsString } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class WordDto extends BaseModelDto {
  @ApiModelProperty()
  @IsString()
  readonly name: string;

  @ApiModelProperty()
  @IsString()
  readonly definition: string;

  @ApiModelProperty()
  readonly userId: string;

  @ApiModelProperty()
  readonly tags: string[];

  @ApiModelProperty()
  @IsInt()
  readonly score: number;

  @ApiModelPropertyOptional()
  readonly userUpVoted?: boolean;

  @ApiModelPropertyOptional()
  readonly userDownVoted?: boolean;

  @ApiModelPropertyOptional()
  readonly userVoteId?: string;

  @ApiModelProperty()
  readonly user: UserDto;

  @ApiModelProperty()
  @IsIso6391()
  readonly locale: string;
}
