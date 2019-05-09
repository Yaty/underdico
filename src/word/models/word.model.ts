import { InstanceType, ModelType, prop } from 'typegoose';
import { BaseModel, schemaOptions } from '../../shared/base.model';
import { Types } from 'mongoose';

class Vote extends BaseModel<Vote> {
  @prop({
    required: [true, 'userId is required'],
  })
  userId: Types.ObjectId;

  @prop()
  value: boolean;

  static get model(): ModelType<Vote> {
    return new Vote().getModelForClass(Vote, { schemaOptions });
  }

  static get modelName(): string {
    return this.model.modelName;
  }

  static createModel(): InstanceType<Vote> {
    return new this.model();
  }
}

// tslint:disable-next-line:max-classes-per-file
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
