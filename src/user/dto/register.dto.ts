import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { CredentialsDto } from './credentials.dto';
import { IsEmail } from 'class-validator';
import { IsIso6391 } from '../../shared/decorators/is-iso-639-1.decorator';

export class RegisterDto extends CredentialsDto {
  @ApiModelProperty({
    required: true,
    format: 'email',
  })
  @IsEmail()
  readonly email: string;

  @ApiModelPropertyOptional()
  @IsIso6391({
    optional: true,
  })
  readonly locale?: string;
}
