import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';

export class RoundDto {
  @ApiModelProperty()
  readonly id: string;

  @ApiModelProperty()
  readonly wordId: string;

  @ApiModelPropertyOptional()
  readonly winnerId: string;

  @ApiModelPropertyOptional()
  readonly currentPlayerId: string;

  @ApiModelProperty()
  readonly createdAt: string;

  @ApiModelPropertyOptional()
  readonly terminatedAt: string;
}
