import { BaseModel, schemaOptions } from '../../shared/base.model';
import { InstanceType, ModelType, prop } from 'typegoose';
import { Types } from 'mongoose';

export class Vote extends BaseModel<Vote> {
  @prop({
    required: [true, 'userId is required'],
  })
  userId: Types.ObjectId;

  @prop({
    required: [true, 'value is required'],
  })
  value: boolean;

  static get model(): ModelType<Vote> {
    return new Vote().getModelForClass(Vote, {
      schemaOptions,
    });
  }

  static get modelName(): string {
    return this.model.modelName;
  }

  static createModel(): InstanceType<Vote> {
    return new this.model();
  }
}
