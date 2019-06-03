import { IsString } from 'class-validator';

export class DeleteAudioParams {
  @IsString()
  readonly wordId: string;
}
