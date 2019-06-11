import { ApiModelProperty } from '@nestjs/swagger';
import { SchemaOptions, Types } from 'mongoose';
import { prop, Typegoose } from 'typegoose';

export class BaseModelDto {
  @ApiModelProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiModelProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiModelProperty() id?: string;
}

// tslint:disable-next-line:max-classes-per-file
export abstract class BaseModel<T> extends Typegoose {
  @prop()
  @ApiModelProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @prop()
  @ApiModelProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiModelProperty()
  '_id': Types.ObjectId;
}

export const schemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
};
