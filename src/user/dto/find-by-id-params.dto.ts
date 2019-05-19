import { IsString } from 'class-validator';

export class FindByIdParamsDto {
  @IsString()
  readonly userId: string;
}
