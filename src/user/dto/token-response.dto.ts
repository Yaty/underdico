import { ApiModelProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiModelProperty()
  readonly token: string;

  @ApiModelProperty()
  readonly userId: string;

  @ApiModelProperty()
  readonly expiresIn: number;

  @ApiModelProperty({
    type: 'string',
    format: 'date-time',
  })
  readonly createdAt: Date;
}
