import { InstanceType, ModelType, prop } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { UserRole } from './user-role.enum';

export class User extends BaseModel<User> {
  @prop({
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Must be at least 3 characters'],
  })
  username: string;

  @prop({
    required: [true, 'Password is required'],
    minlength: [6, 'Must be at least 6 characters'],
  })
  password: string;

  @prop({
    validate: /\S+@\S+\.\S+/,
  })
  email: string;

  @prop({
    enum: UserRole,
    default: UserRole.User,
  })
  role?: UserRole;

  @prop({
    default: 'fr',
  })
  locale: string;

  karma?: number;
  score?: number;

  static get model(): ModelType<User> {
    return new User().getModelForClass(User, {
      schemaOptions,
    });
  }

  static get modelName(): string {
    return this.model.modelName;
  }

  static createModel(): InstanceType<User> {
    return new this.model();
  }
}
