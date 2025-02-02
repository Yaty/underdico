import { arrayProp, InstanceType, ModelType, prop, Ref } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { Types } from 'mongoose';
import { Vote } from '../../vote/models/vote.model';
import { User } from '../../user/models/user.model';

export class Word extends BaseModel<Word> {
  @prop({
    required: [true, 'name is required'],
  })
  name: string;

  @prop({
    required: [true, 'definition is required'],
  })
  definition: string;

  @prop({
    required: [true, 'userId is required'],
    ref: User,
  })
  userId: Types.ObjectId;

  @arrayProp({
    required: [true, 'tags is required'],
    items: String,
  })
  tags: string[];

  @arrayProp({
    default: [],
    itemsRef: Vote,
  })
  votes: Array<Ref<Vote>>;

  @prop({
    default: 'fr',
  })
  locale: string;

  @prop({
    required: false,
    maxlength: 1024,
  })
  example?: string;

  @prop({
    default: false,
  })
  hasAudio: boolean;

  user?: User;

  static get model(): ModelType<Word> {
    return new Word().getModelForClass(Word, { schemaOptions });
  }

  static get modelName(): string {
    return this.model.modelName;
  }

  static createModel(): InstanceType<Word> {
    return new this.model();
  }
}
