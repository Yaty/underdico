import { User } from '../models/user.model';

export interface IUsersService {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | void>;
  findOne(options: object): Promise<User | void>;
  create(user: User): Promise<User>;
  update(id: string, newValue: User): Promise<User | void>;
  delete(id: string): Promise<User>;
}
