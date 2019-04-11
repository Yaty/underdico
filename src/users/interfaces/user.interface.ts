import { Document } from 'mongoose';

export interface User extends Document {
  readonly username: string;
  readonly password: string;
  readonly email: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
