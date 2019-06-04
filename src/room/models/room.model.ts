import { arrayProp, InstanceType, ModelType, prop, Ref } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { User } from '../../user/models/user.model';

export class Room extends BaseModel<Room> {
  @prop({
    required: [true, 'name is required'],
    minlength: [3, 'Must be at least 3 characters'],
  })
  name: string;

  @prop({
    default: 10,
  })
  maxPlayers: number;

  @prop({
    default: false,
  })
  isPrivate: boolean;

  @arrayProp({
    default: [],
    itemsRef: User,
  })
  playersIds: Array<Ref<User>>;

  @arrayProp({
    default: [],
  })
  tags: string[];

  @prop({
    required: [true, 'owner is required'],
    ref: User,
  })
  ownerId: Ref<User>;

  static get model(): ModelType<Room> {
    return new Room().getModelForClass(Room, {
      schemaOptions,
    });
  }

  static get modelName(): string {
    return this.model.modelName;
  }

  static createModel(): InstanceType<Room> {
    return new this.model();
  }
}
