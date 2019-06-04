import { IsString } from 'class-validator';

export class DownloadAvatarParams {
  @IsString()
  readonly userId: string;
}
