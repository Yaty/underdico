import 'automapper-ts/dist/automapper';
import { Types } from 'mongoose';
import { InstanceType, ModelType, Typegoose } from 'typegoose';

export abstract class BaseService<T extends Typegoose> {
  protected model: ModelType<T>;
  protected mapper: AutoMapperJs.AutoMapper;

  private get modelName(): string {
    return this.model.modelName;
  }

  private get viewModelName(): string {
    return `${this.model.modelName}Vm`;
  }

  async map<K>(
    object: Partial<InstanceType<T>> | Array<Partial<InstanceType<T>>>,
    sourceKey: string = this.modelName,
    destinationKey: string = this.viewModelName,
  ): Promise<K> {
    return this.mapper.map(sourceKey, destinationKey, object);
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

  private static toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId(id);
  }
}
