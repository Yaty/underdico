import { IsString } from 'class-validator';

export class UpdateParamsDto {
  @IsString()
  readonly userId: string;
}
