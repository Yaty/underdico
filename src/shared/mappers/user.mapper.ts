import { Injectable } from '@nestjs/common';
import { UserDto } from '../../user/dto/user.dto';
import { User } from '../../user/models/user.model';
import { BaseMapper } from './base.mapper';
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
      karma: 'karma',
      locale: 'locale',
      score: 'score',
    });
  }

  public map(user: User, karma?: number): UserDto {
    return morphism(this.schema, user);
  }

  public mapArray(users: User[]): UserDto[] {
    return users.map(this.map);
  }
}
