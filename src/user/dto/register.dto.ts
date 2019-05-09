import { ApiModelProperty } from '@nestjs/swagger';
import { TokenDto } from './token.dto';

export class RegisterDto extends TokenDto {
  @ApiModelProperty({
    required: true,
    format: 'email',
  })
  email: string;
}
