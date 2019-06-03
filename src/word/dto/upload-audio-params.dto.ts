import { IsString } from 'class-validator';

export class UploadAudioParams {
  @IsString()
  readonly wordId: string;
}
