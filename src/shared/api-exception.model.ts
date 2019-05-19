import { ApiModelPropertyOptional } from '@nestjs/swagger';

export class ApiException {
  @ApiModelPropertyOptional() statusCode?: number;
  @ApiModelPropertyOptional() message?: string;
  @ApiModelPropertyOptional() status?: string;
  @ApiModelPropertyOptional() error?: string;
  @ApiModelPropertyOptional({
    type: Object,
    isArray: true,
  }) errors?: object[];
  @ApiModelPropertyOptional() timestamp?: string;
  @ApiModelPropertyOptional() path?: string;
}
