import { ApiModelProperty } from '@nestjs/swagger';
import { CredentialsDto } from './credentials.dto';

export class RegisterDto extends CredentialsDto {
  @ApiModelProperty({
    required: true,
    format: 'email',
  })
  email: string;
}
