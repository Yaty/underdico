import { IsString } from 'class-validator';

export class UploadAvatarParams {
  @IsString()
  readonly userId: string;
}
