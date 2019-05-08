import { UserRole } from '../../user/models/user-role.enum';

export interface JwtPayload {
  username: string;
  email: string;
  role: UserRole;
  id: string;
}
