import { InstanceType, ModelType, prop } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { Types } from 'mongoose';
import { Vote } from './vote.model';

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
  })
  userId: Types.ObjectId;

  @prop({
    required: [true, 'tags is required'],
  })
  tags: string[];

  @prop({
    required: [true, 'votes is required'],
  })
  votes: Vote[];

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
