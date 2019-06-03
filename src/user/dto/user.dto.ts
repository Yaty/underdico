import { ApiModelProperty } from '@nestjs/swagger';
import { UserRole } from '../models/user-role.enum';
import { BaseModelDto } from '../../shared/base.model';
import { IsEmail, IsInt, IsString } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class UserDto extends BaseModelDto {
  @ApiModelProperty()
  @IsString()
  readonly username: string;

  @ApiModelProperty()
  @IsEmail()
  readonly email: string;

  @ApiModelProperty()
  @IsIso6391()
  readonly locale: string;

  @ApiModelProperty()
  @IsInt()
  readonly karma?: number;

  @ApiModelProperty({ enum: UserRole })
  @IsString()
  readonly role?: UserRole;
}
