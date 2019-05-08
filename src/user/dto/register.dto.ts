import { ApiModelProperty } from '@nestjs/swagger';
import { LoginDto } from './login.dto';

export class RegisterDto extends LoginDto {
  @ApiModelProperty({
    required: true,
    format: 'email',
  })
  email: string;
}
