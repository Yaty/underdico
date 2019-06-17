import { User } from '../../user/models/user.model';
import { InstanceType } from 'typegoose';

export class BaseRoomDto {
  readonly user: InstanceType<User>;
  readonly roomId: string;
}
