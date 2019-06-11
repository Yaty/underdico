import { arrayProp, InstanceType, ModelType, prop, Ref } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { User } from '../../user/models/user.model';
import { RoomStatus } from './room-status.enum';
import { Word } from '../../word/models/word.model';

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

  @prop({
    default: false,
  })
  isRanked: boolean;

  @prop({
    enum: RoomStatus,
    default: RoomStatus.Created,
  })
  status: RoomStatus;

  @arrayProp({
    default: [],
    itemsRef: User,
  })
  playersIds: Array<Ref<User>>;

  @arrayProp({
    default: [],
    items: String,
  })
  tags: string[];

  @prop({
    required: false,
  })
  enteredAt: Date;

  @prop({
    required: false,
  })
  leavedAt: Date;

  @prop({
    required: [true, 'owner is required'],
    ref: User,
  })
  ownerId: Ref<User>;

  @prop({
    required: false,
    ref: Word,
  })
  currentWord: Ref<Word>;

  @arrayProp({
    default: [],
    itemsRef: Word,
  })
  words: Array<Ref<Word>>;

  @prop({
    required: false,
    ref: User,
  })
  currentPlayer: Ref<User>;

  @prop({
    default: 'fr',
  })
  locale: string;

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
