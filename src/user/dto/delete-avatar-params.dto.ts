import { IsString } from 'class-validator';

export class DeleteAvatarParams {
  @IsString()
  readonly userId: string;
}
