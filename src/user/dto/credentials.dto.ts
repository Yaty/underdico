import { ApiModelProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CredentialsDto {
  @ApiModelProperty({
    required: true,
    minLength: 3,
    maxLength: 16,
  })
  @IsString()
  @Length(3, 16)
  readonly username: string;

  @ApiModelProperty({
    required: true,
    minLength: 6,
    maxLength: 32,
    type: String,
    format: 'password',
  })
  @IsString()
  @Length(6, 32)
  readonly password: string;
}
