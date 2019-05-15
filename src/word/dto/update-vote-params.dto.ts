import { IsString } from 'class-validator';

export class UpdateVoteParamsDto {
  @IsString()
  readonly wordId: string;

  @IsString()
  readonly voteId: string;
}
