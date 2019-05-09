import { ApiModelProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiModelProperty() token: string;
  @ApiModelProperty() userId: string;
  @ApiModelProperty() expiresIn: number;
  @ApiModelProperty({
    type: 'string',
    format: 'date-time',
  }) createdAt: Date;
}
