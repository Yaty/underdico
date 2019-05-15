import { ApiModelProperty } from '@nestjs/swagger';
import { CredentialsDto } from './credentials.dto';
import { IsEmail } from 'class-validator';

export class RegisterDto extends CredentialsDto {
  @ApiModelProperty({
    required: true,
    format: 'email',
  })
  @IsEmail()
  readonly email: string;
}
