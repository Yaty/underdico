import { ApiModelProperty } from '@nestjs/swagger';
import { UserRole } from '../models/user-role.enum';
import { BaseModelDto } from '../../shared/base.model';

export class UserDto extends BaseModelDto {
  @ApiModelProperty()
  readonly username: string;

  @ApiModelProperty()
  readonly email: string;

  @ApiModelProperty()
  readonly locale: string;

  @ApiModelProperty()
  readonly karma?: number;

  @ApiModelProperty()
  readonly score: number;

  @ApiModelProperty({
    enum: UserRole,
  })
  readonly role?: UserRole;
}
