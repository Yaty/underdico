import { Types } from 'mongoose';
import { InstanceType, ModelType } from 'typegoose';
import { BaseMapper } from './base.mapper';
import { BaseModel, BaseModelDto } from './base.model';

export abstract class BaseService<T extends BaseModel<T>, K extends BaseModelDto> {
  public model: ModelType<T>;
  public mapper: BaseMapper<K, T>;

  private get modelName(): string {
    return this.model.modelName;
  }

  private get dtoName(): string {
    return `${this.model.modelName}Dto`;
  }

  findAll(filter = {}): Promise<Array<InstanceType<T>>> {
    return this.model.find(filter).exec();
  }

  findOne(filter = {}): Promise<InstanceType<T>> {
    return this.model.findOne(filter).exec();
  }

  findById(id: string): Promise<InstanceType<T>> {
    return this.model.findById(BaseService.toObjectId(id)).exec();
  }

  create(item: InstanceType<T>): Promise<InstanceType<T>> {
    return this.model.create(item);
  }

  delete(id: string): Promise<InstanceType<T>> {
    return this.model.findByIdAndRemove(BaseService.toObjectId(id)).exec();
  }

  update(id: string, item: InstanceType<T>): Promise<InstanceType<T>> {
    return this.model.findByIdAndUpdate(BaseService.toObjectId(id), item, {
      new: true,
    }).exec();
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
}
