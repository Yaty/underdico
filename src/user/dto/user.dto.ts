import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../models/user-role.enum';
import { BaseModelDto } from '../../shared/base.model';

export class UserDto extends BaseModelDto {
  @ApiModelProperty()
  readonly username: string;

  @ApiModelProperty()
  readonly email: string;

  @ApiModelPropertyOptional()
  readonly karma?: number;

  @ApiModelPropertyOptional({ enum: UserRole })
  readonly role?: UserRole;
}
