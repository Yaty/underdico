import { IsString } from 'class-validator';

export class CreateVoteParamsDto {
  @IsString()
  readonly wordId: string;
}
