import { ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { RegisterDto } from './register.dto';

export class UpdateUserDto extends RegisterDto {
  @ApiModelPropertyOptional()
  @IsOptional()
  readonly username: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  readonly email: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  password: string;
}
