import { IsString } from 'class-validator';

export class DownloadAudioParams {
  @IsString()
  readonly wordId: string;
}
