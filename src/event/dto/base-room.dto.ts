import { User } from '../../user/models/user.model';

export class BaseRoomDto {
  readonly user: User;
  readonly roomId: string;
}
