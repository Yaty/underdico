import { BaseModel, BaseModelDto } from '../base.model';
import { StrictSchema } from 'morphism';

export abstract class BaseMapper<T extends BaseModelDto, K extends BaseModel<K>> {
  public constructor(protected schema?: StrictSchema<T, K>) {}
  public abstract map(input: K, ...options: any): T;
  public abstract mapArray(input: K[], ...options: any): T[];
}
