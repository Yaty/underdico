import { Injectable } from '@nestjs/common';
import { UserDto } from '../dto/user.dto';
import { User } from '../models/user.model';
import { BaseMapper } from '../../shared/base.mapper';
import { morphism } from 'morphism';

@Injectable()
export class UserMapper extends BaseMapper<UserDto, User> {
  constructor() {
    super({
      id: '_id',
      username: 'username',
      email: 'email',
      role: 'role',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    });
  }

  public map(user: User): UserDto {
    return morphism(this.schema, user);
  }
}
