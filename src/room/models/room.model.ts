import { arrayProp, InstanceType, ModelType, prop, Ref } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { User } from '../../user/models/user.model';
import { RoomStatus } from './room-status.enum';
import { Word } from '../../word/models/word.model';

class Round {
  @prop({
    required: false,
    ref: Word,
  })
  wordId: Ref<Word>;

  @prop({
    ref: Word,
    localField: 'wordId',
    foreignField: '_id',
    justOne: true,
  })
  get word() {
    return undefined;
  }

  @prop({
    required: false,
    ref: User,
  })
  winnerId: Ref<User>;

  @prop({
    ref: User,
    localField: 'winnerId',
    foreignField: '_id',
    justOne: true,
  })
  get winner() {
    return undefined;
  }

  @prop({
    required: false,
    ref: User,
  })
  currentPlayerId: Ref<User>;

  @prop({
    ref: User,
    localField: 'currentPlayerId',
    foreignField: '_id',
    justOne: true,
  })
  get currentPlayer() {
    return undefined;
  }

  @prop()
  createdAt: Date;

  @prop()
  terminatedAt: Date;
}

// tslint:disable-next-line:max-classes-per-file
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
    required: [true, 'owner is required'],
    ref: User,
  })
  ownerId: Ref<User>;

  @prop({
    ref: User,
    localField: 'ownerId',
    foreignField: '_id',
    justOne: true,
  })
  get owner() {
    return undefined;
  }

  @prop({
    default: 'fr',
  })
  locale: string;

  @arrayProp({
    default: [],
    items: Round,
  })
  rounds: Round[];

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
