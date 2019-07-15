import { IsString } from 'class-validator';

export class DeleteByIdParamsDto {
  @IsString()
  readonly wordId: string;
}
