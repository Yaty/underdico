import { BaseRoomDto } from './base-room.dto';

export class JoinRoomDto extends BaseRoomDto {
  readonly code?: string;
}
