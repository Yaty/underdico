import { Types } from 'mongoose';
import { InstanceType, ModelType } from 'typegoose';
import { BaseMapper } from './mappers/base.mapper';
import { BaseModel, BaseModelDto } from './base.model';
import { EventEmitter } from 'events';

export abstract class BaseService<T extends BaseModel<T>, K extends BaseModelDto> extends EventEmitter {
  protected constructor(
    public model: ModelType<T>,
    public mapper: BaseMapper<K, T>,
  ) {
    super();
  }

  private get modelName(): string {
    return this.model.modelName;
  }

  private get dtoName(): string {
    return `${this.model.modelName}Dto`;
  }

  async doNotExists(id: string): Promise<boolean> {
    if (BaseService.isInvalidObjectId(id)) {
      return true;
    }

    return (await this.count({
      _id: id,
    })) === 0;
  }

  findAll(filter = {}): Promise<Array<InstanceType<T>>> {
    return this.model.find(filter).exec();
  }

  findOne(filter = {}): Promise<InstanceType<T>> {
    return this.model.findOne(filter).exec();
  }

  findById(id: string): Promise<InstanceType<T>> {
    if (BaseService.isInvalidObjectId(id)) {
      return undefined;
    }

    return this.model.findById(BaseService.toObjectId(id)).exec();
  }

  create(item: InstanceType<T>): Promise<InstanceType<T>> {
    return this.model.create(item);
  }

  delete(id: string): Promise<InstanceType<T>> {
    if (BaseService.isInvalidObjectId(id)) {
      return undefined;
    }

    return this.model.findByIdAndRemove(BaseService.toObjectId(id)).exec();
  }

  update(id: string, item: InstanceType<T>): Promise<InstanceType<T>> {
    if (BaseService.isInvalidObjectId(id)) {
      return undefined;
    }

    return this.model.findByIdAndUpdate(BaseService.toObjectId(id), item, {
      new: true,
    }).exec();
  }

  count(filter = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async clearCollection(filter = {}): Promise<void> {
    await this.model.deleteMany(filter).exec();
  }

  public static toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId(id);
  }

  public static objectIdToString(objectId: Types.ObjectId) {
    return objectId.toString();
  }

  public static isInvalidObjectId(id: string): boolean {
    return !Types.ObjectId.isValid(id);
  }
}
