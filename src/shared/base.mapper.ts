import { BaseModel, BaseModelDto } from './base.model';
import { StrictSchema } from 'morphism';

export abstract class BaseMapper<T extends BaseModelDto, K extends BaseModel<K>> {
  public constructor(protected schema?: StrictSchema<T, K>) {}
  public abstract map(input: K, ...options: any): T;

  public mapArray(input: K[], ...options: any): T[] {
    return input.map((i) => this.map(i, ...options));
  }
}
