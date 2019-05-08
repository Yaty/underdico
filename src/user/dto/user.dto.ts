import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../models/user-role.enum';
import { BaseModelDto } from '../../shared/base.model';

export class UserDto extends BaseModelDto {
  @ApiModelProperty() username: string;
  @ApiModelProperty() email: string;
  @ApiModelPropertyOptional({ enum: UserRole })
  role?: UserRole;
}
